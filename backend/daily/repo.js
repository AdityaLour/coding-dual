import pool from "../db/connection.js";

// The daily challenge in MySQL. Plain queries only; the rules live in daily.js.
export const repo = {
  async get(day) {
    const [rows] = await pool.execute("SELECT problem_id FROM daily_problems WHERE day = ?", [day]);
    return rows[0]?.problem_id ?? null;
  },

  // Two servers (or two requests) may pick at the same moment: the first row wins and the rest are ignored.
  async insertIgnore(day, problemId) {
    await pool.execute("INSERT IGNORE INTO daily_problems (day, problem_id) VALUES (?, ?)", [day, problemId]);
  },

  async recentProblemIds(limit) {
    const [rows] = await pool.query("SELECT problem_id FROM daily_problems ORDER BY day DESC LIMIT ?", [limit]);
    return rows.map((row) => row.problem_id);
  },

  // The days this user solved the daily problem: an Accepted submission on that problem during that
  // IST day. A solve from Practice counts the same as one from the Daily page.
  // (UNIX_TIMESTAMP + 19800) DIV 86400 is the same day number as istDay() in days.js.
  async solvedDays(userId) {
    const [rows] = await pool.execute(
      `SELECT DISTINCT dp.day
       FROM daily_problems dp
       JOIN practice_submissions ps ON ps.problem_id = dp.problem_id
       WHERE ps.user_id = ? AND ps.verdict = 'Accepted'
         AND (UNIX_TIMESTAMP(ps.created_at) + 19800) DIV 86400 = dp.day`,
      [userId],
    );
    return rows.map((row) => Number(row.day));
  },
};
