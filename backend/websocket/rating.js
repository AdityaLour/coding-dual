import { withTransaction } from "../db/transaction.js";

// Elo. Provisional players (fewer than PROVISIONAL_DUELS rated duels) move faster.
export const PROVISIONAL_DUELS = 10;
const K_PROVISIONAL = 40;
const K_NORMAL = 24;
const FLOOR = 100;
const CEILING = 3500;

const expected = (mine, theirs) => 1 / (1 + 10 ** ((theirs - mine) / 400));
const kFor = (played) => (played < PROVISIONAL_DUELS ? K_PROVISIONAL : K_NORMAL);

// score: 1 = win, 0.5 = draw, 0 = loss. Returns the new rating.
export function nextRating(mine, theirs, played, score) {
  const change = Math.round(kFor(played) * (score - expected(mine, theirs)));
  return Math.min(CEILING, Math.max(FLOOR, mine + change));
}

// Applies a finished duel to both players and the duel row in ONE transaction, exactly once:
// the duel is only settled while it is still 'active', so a second call changes nothing.
// winnerId = null is a draw. Returns { a, b } as { before, after }, or null if already settled.
export function settleDuel(duel, winnerId, reason) {
  return withTransaction(async (conn) => {
    // Lock both rows in id order, so two duels settling at once can't deadlock.
    const [rows] = await conn.execute(
      "SELECT id, rating, duels_played FROM users WHERE id IN (?, ?) ORDER BY id FOR UPDATE",
      [duel.playerA, duel.playerB],
    );
    const a = rows.find((row) => row.id === duel.playerA);
    const b = rows.find((row) => row.id === duel.playerB);
    const scoreA = winnerId === null ? 0.5 : winnerId === duel.playerA ? 1 : 0;
    const afterA = nextRating(a.rating, b.rating, a.duels_played, scoreA);
    const afterB = nextRating(b.rating, a.rating, b.duels_played, 1 - scoreA);

    const [settled] = await conn.execute(
      `UPDATE duels SET status = 'finished', winner_id = ?, end_reason = ?,
         rating_a_after = ?, rating_b_after = ?, ended_at = NOW()
       WHERE id = ? AND status = 'active'`,
      [winnerId, reason, afterA, afterB, duel.duelId],
    );
    if (settled.affectedRows !== 1) return null;

    for (const [id, rating] of [[a.id, afterA], [b.id, afterB]]) {
      await conn.execute(
        "UPDATE users SET rating = ?, duels_played = duels_played + 1 WHERE id = ?",
        [rating, id],
      );
    }
    return {
      a: { before: a.rating, after: afterA },
      b: { before: b.rating, after: afterB },
    };
  });
}
