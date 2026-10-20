import pool from "../db/connection.js";

const num = (value) => Number(value ?? 0);

// One duel from the player's side: who the rival was, both ratings, and when it ended.
// Rows are newest first. `me` is the player's id; the IF()s pick their side of the duel row.
const SIDE = `
  SELECT d.id, d.problem_id AS problemId, d.winner_id AS winnerId, d.end_reason AS endReason, d.rated,
         UNIX_TIMESTAMP(d.started_at) AS startedAt, UNIX_TIMESTAMP(d.ended_at) AS endedAt,
         IF(d.player_a = ?, d.rating_a_before, d.rating_b_before) AS ratingBefore,
         IF(d.player_a = ?, d.rating_a_after, d.rating_b_after) AS ratingAfter,
         IF(d.player_a = ?, d.rating_b_before, d.rating_a_before) AS oppRating,
         o.id AS oppId, o.username AS oppName
    FROM duels d
    JOIN users o ON o.id = IF(d.player_a = ?, d.player_b, d.player_a)
   WHERE d.status = 'finished' AND (d.player_a = ? OR d.player_b = ?)`;

const mine = (id) => [id, id, id, id, id, id];

const duelRow = (r) => ({
  id: r.id,
  problemId: r.problemId,
  winnerId: r.winnerId ?? null,
  endReason: r.endReason ?? null,
  rated: Boolean(r.rated),
  startedAt: num(r.startedAt),
  endedAt: num(r.endedAt),
  ratingBefore: num(r.ratingBefore),
  ratingAfter: r.ratingAfter === null ? null : num(r.ratingAfter),
  oppRating: num(r.oppRating),
  oppId: r.oppId,
  oppName: r.oppName,
});

// Which duels a filter lets through. The ids in `params` follow the order of the fragments.
const FILTER_SQL = {
  all: () => ({ sql: "", params: [] }),
  W: (id) => ({ sql: " AND d.rated = 1 AND d.winner_id = ?", params: [id] }),
  L: (id) => ({ sql: " AND d.rated = 1 AND d.winner_id IS NOT NULL AND d.winner_id <> ?", params: [id] }),
  D: () => ({ sql: " AND d.rated = 1 AND d.winner_id IS NULL", params: [] }),
  U: () => ({ sql: " AND d.rated = 0", params: [] }),
};

export const repo = {
  async user(id) {
    const [rows] = await pool.execute(
      `SELECT id, username, rating, duels_played AS duels, UNIX_TIMESTAMP(created_at) * 1000 AS createdAt
         FROM users WHERE id = ?`,
      [id],
    );
    return rows[0] ? { ...rows[0], createdAt: num(rows[0].createdAt) } : null;
  },

  // Exact counts over every finished duel, however many there are.
  async totals(id) {
    const [[row]] = await pool.execute(
      `SELECT COALESCE(SUM(d.rated = 1 AND d.winner_id = ?), 0) AS wins,
              COALESCE(SUM(d.rated = 1 AND d.winner_id IS NOT NULL AND d.winner_id <> ?), 0) AS losses,
              COALESCE(SUM(d.rated = 1 AND d.winner_id IS NULL), 0) AS draws,
              COALESCE(SUM(d.rated = 0), 0) AS unrated
         FROM duels d
        WHERE d.status = 'finished' AND (d.player_a = ? OR d.player_b = ?)`,
      [id, id, id, id],
    );
    return { wins: num(row.wins), losses: num(row.losses), draws: num(row.draws), unrated: num(row.unrated) };
  },

  // The latest duels, newest first. ratedOnly leaves out the unrated ones (the rating chart).
  async recent(id, limit, { ratedOnly = false } = {}) {
    const [rows] = await pool.query(
      `${SIDE}${ratedOnly ? " AND d.rated = 1" : ""} ORDER BY d.ended_at DESC, d.id DESC LIMIT ?`,
      [...mine(id), limit],
    );
    return rows.map(duelRow);
  },

  // One page of the match history. `cursor` is { endedAt, id } of the last row already shown.
  async page(id, filter, cursor, limit) {
    const picked = FILTER_SQL[filter](id);
    const after = cursor
      ? " AND (d.ended_at < FROM_UNIXTIME(?) OR (d.ended_at = FROM_UNIXTIME(?) AND d.id < ?))"
      : "";
    const [rows] = await pool.query(
      `${SIDE}${picked.sql}${after} ORDER BY d.ended_at DESC, d.id DESC LIMIT ?`,
      [...mine(id), ...picked.params, ...(cursor ? [cursor.endedAt, cursor.endedAt, cursor.id] : []), limit],
    );
    return rows.map(duelRow);
  },

  // How this person signs in, and an email change waiting for its link. The password hash never leaves the database.
  async account(id) {
    const [[row]] = await pool.execute(
      `SELECT u.email, u.email_verified_at IS NOT NULL AS verified,
              EXISTS(SELECT 1 FROM logins l WHERE l.user_id = u.id AND l.provider = 'email' AND l.password IS NOT NULL) AS hasPassword,
              EXISTS(SELECT 1 FROM logins l WHERE l.user_id = u.id AND l.provider = 'google') AS google,
              (SELECT t.new_email FROM email_tokens t
                WHERE t.user_id = u.id AND t.purpose = 'email_change' AND t.used_at IS NULL AND t.expires_at > NOW()
                ORDER BY t.id DESC LIMIT 1) AS pendingEmail
         FROM users u WHERE u.id = ?`,
      [id],
    );
    return row
      ? {
          email: row.email,
          verified: Boolean(row.verified),
          password: Boolean(row.hasPassword),
          google: Boolean(row.google),
          pendingEmail: row.pendingEmail ?? null,
        }
      : null;
  },
};
