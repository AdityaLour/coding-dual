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

// The same two players get at most this many rated duels against each other in a rolling day.
// Further duels are played but not rated: it stops two accounts from farming rating off each other.
export const PAIR_DAILY_CAP = 3;

// Applies a finished duel to both players and the duel row, on one connection inside one
// transaction. The duel is only settled while it is still 'active', so a second call changes nothing.
// winnerId = null is a draw. Returns { a, b } as { before, after } (plus rated: false and
// capped: true when the pair cap applied), or null if it was already settled.
export async function applySettlement(conn, duel, winnerId, reason) {
  // Lock both rows in id order, so two duels settling at once can't deadlock.
  const [rows] = await conn.execute(
    "SELECT id, rating, duels_played FROM users WHERE id IN (?, ?) ORDER BY id FOR UPDATE",
    [duel.playerA, duel.playerB],
  );
  const a = rows.find((row) => row.id === duel.playerA);
  const b = rows.find((row) => row.id === duel.playerB);

  const [recent] = await conn.execute(
    `SELECT COUNT(*) AS n FROM duels
      WHERE status = 'finished' AND rated = 1 AND id <> ?
        AND ended_at > NOW() - INTERVAL 1 DAY
        AND ((player_a = ? AND player_b = ?) OR (player_a = ? AND player_b = ?))`,
    [duel.duelId, a.id, b.id, b.id, a.id],
  );
  const capped = Number(recent[0].n) >= PAIR_DAILY_CAP;

  const scoreA = winnerId === null ? 0.5 : winnerId === duel.playerA ? 1 : 0;
  const afterA = capped ? a.rating : nextRating(a.rating, b.rating, a.duels_played, scoreA);
  const afterB = capped ? b.rating : nextRating(b.rating, a.rating, b.duels_played, 1 - scoreA);

  const [settled] = await conn.execute(
    `UPDATE duels SET status = 'finished', winner_id = ?, end_reason = ?, rated = ?,
       rating_a_after = ?, rating_b_after = ?, ended_at = NOW()
     WHERE id = ? AND status = 'active'`,
    [winnerId, reason, capped ? 0 : 1, afterA, afterB, duel.duelId],
  );
  if (settled.affectedRows !== 1) return null;

  const result = {
    a: { before: a.rating, after: afterA },
    b: { before: b.rating, after: afterB },
  };
  if (capped) return { ...result, rated: false, capped: true }; // nothing else changes

  for (const [id, rating] of [[a.id, afterA], [b.id, afterB]]) {
    await conn.execute(
      "UPDATE users SET rating = ?, duels_played = duels_played + 1 WHERE id = ?",
      [rating, id],
    );
  }
  return result;
}

export const settleDuel = (duel, winnerId, reason) =>
  withTransaction((conn) => applySettlement(conn, duel, winnerId, reason));
