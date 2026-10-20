import pool from "../db/connection.js";

// Practice submissions in MySQL. Plain queries only; the rules live in practice.js.
export const repo = {
  async insert(userId, problemId, languageId, source) {
    const [result] = await pool.execute(
      `INSERT INTO practice_submissions (user_id, problem_id, language_id, source, verdict)
       VALUES (?, ?, ?, ?, 'Judging')`,
      [userId, problemId, languageId, source],
    );
    return result.insertId;
  },

  async finish(id, { verdict, failedTest, runtimeMs }) {
    await pool.execute(
      "UPDATE practice_submissions SET verdict = ?, failed_test = ?, runtime_ms = ? WHERE id = ?",
      [verdict, failedTest ?? null, runtimeMs ?? null, id],
    );
  },

  async get(id, userId) {
    const [rows] = await pool.execute(
      `SELECT id, language_id, source, verdict, failed_test, runtime_ms, created_at
       FROM practice_submissions WHERE id = ? AND user_id = ?`,
      [id, userId],
    );
    return rows[0] ?? null;
  },

  async history(userId, problemId, limit) {
    const [rows] = await pool.query(
      `SELECT id, language_id, verdict, failed_test, runtime_ms, created_at
       FROM practice_submissions WHERE user_id = ? AND problem_id = ?
       ORDER BY id DESC LIMIT ?`,
      [userId, problemId, limit],
    );
    return rows;
  },

  // One row per problem the user has tried: whether any submission was Accepted (and when the latest one was), and how many were judged.
  async progress(userId) {
    const [rows] = await pool.execute(
      `SELECT p.slug, MAX(ps.verdict = 'Accepted') AS solved, COUNT(*) AS attempts,
              MAX(CASE WHEN ps.verdict = 'Accepted' THEN ps.created_at END) AS solved_at
       FROM practice_submissions ps JOIN problems p ON p.id = ps.problem_id
       WHERE ps.user_id = ? AND ps.verdict <> 'Judging'
       GROUP BY p.slug`,
      [userId],
    );
    return rows;
  },

  async countLastDay(userId) {
    const [[{ n }]] = await pool.execute(
      `SELECT COUNT(*) AS n FROM practice_submissions
       WHERE user_id = ? AND created_at > NOW() - INTERVAL 1 DAY`,
      [userId],
    );
    return Number(n);
  },

  // At boot: a restart loses the in-memory job, so anything still 'Judging' can never finish.
  async failStale() {
    const [result] = await pool.execute(
      "UPDATE practice_submissions SET verdict = 'Judge Error' WHERE verdict = 'Judging'",
    );
    return result.affectedRows;
  },
};
