import pool from "../db/connection.js";

const MAX_RANKED = 20000; // a safety cap on one snapshot, far above any real number of players

const num = (value) => Number(value ?? 0);

// Everyone with a username who finished placement, with their rated record.
// A draw is neither a win nor a loss. Void and unrated duels never count.
export async function allTimeRows(placement) {
  const [rows] = await pool.execute(
    `SELECT u.id, u.username, u.rating, u.duels_played AS duels,
            COALESCE(s.wins, 0) AS wins, COALESCE(s.losses, 0) AS losses
       FROM users u
       LEFT JOIN (
         SELECT uid, SUM(won) AS wins, SUM(lost) AS losses FROM (
           SELECT player_a AS uid, COALESCE(winner_id = player_a, 0) AS won,
                  COALESCE(winner_id <> player_a, 0) AS lost
             FROM duels WHERE status = 'finished' AND rated = 1
           UNION ALL
           SELECT player_b, COALESCE(winner_id = player_b, 0), COALESCE(winner_id <> player_b, 0)
             FROM duels WHERE status = 'finished' AND rated = 1
         ) x GROUP BY uid
       ) s ON s.uid = u.id
      WHERE u.username IS NOT NULL AND u.duels_played >= ?
      ORDER BY u.rating DESC, u.id ASC
      LIMIT ${MAX_RANKED}`,
    [placement],
  );
  return rows.map((r) => ({ ...r, wins: num(r.wins), losses: num(r.losses) }));
}

// Rating points gained and rated duels played between two instants (epoch seconds), per player.
const WEEK_SQL = `SELECT t.uid AS id, u.username, u.rating, u.duels_played AS duels,
         COUNT(*) AS weekDuels, SUM(t.delta) AS gain, SUM(t.won) AS weekWins
    FROM (
      SELECT player_a AS uid, rating_a_after - rating_a_before AS delta,
             COALESCE(winner_id = player_a, 0) AS won
        FROM duels
       WHERE status = 'finished' AND rated = 1
         AND ended_at >= FROM_UNIXTIME(?) AND ended_at < FROM_UNIXTIME(?)
      UNION ALL
      SELECT player_b, rating_b_after - rating_b_before, COALESCE(winner_id = player_b, 0)
        FROM duels
       WHERE status = 'finished' AND rated = 1
         AND ended_at >= FROM_UNIXTIME(?) AND ended_at < FROM_UNIXTIME(?)
    ) t
    JOIN users u ON u.id = t.uid`;

const weekRow = (r) => ({
  ...r,
  weekDuels: num(r.weekDuels),
  gain: num(r.gain),
  weekWins: num(r.weekWins),
});

export async function weeklyRows(startMs, endMs) {
  const a = Math.floor(startMs / 1000);
  const b = Math.floor(endMs / 1000);
  const [rows] = await pool.execute(
    `${WEEK_SQL} WHERE u.username IS NOT NULL GROUP BY t.uid, u.username, u.rating, u.duels_played`,
    [a, b, a, b],
  );
  return rows.map(weekRow);
}

// One person's own numbers, whether or not they are ranked.
export async function userRow(id) {
  const [rows] = await pool.execute(
    "SELECT id, username, rating, duels_played AS duels FROM users WHERE id = ?",
    [id],
  );
  return rows[0] ?? null;
}

export async function userWeek(id, startMs, endMs) {
  const a = Math.floor(startMs / 1000);
  const b = Math.floor(endMs / 1000);
  const [rows] = await pool.execute(
    `${WEEK_SQL} WHERE t.uid = ? GROUP BY t.uid, u.username, u.rating, u.duels_played`,
    [a, b, a, b, id],
  );
  return rows[0] ? weekRow(rows[0]) : null;
}

export const repo = { allTimeRows, weeklyRows, userRow, userWeek };
