import pool from "../db/connection.js";

const BAND = 150; // a problem this close to the players' average rating counts as a fit
const bank = new Map(); // problem id -> problem, with its hidden tests; loaded once at boot

export async function loadBank() {
  const [problems] = await pool.query(
    `SELECT id, slug, title, statement, rating, time_limit_ms, memory_limit_kb, duel_minutes
     FROM problems WHERE active = 1`,
  );
  const [cases] = await pool.query(
    "SELECT problem_id, is_sample, input, expected FROM test_cases ORDER BY problem_id, position",
  );
  bank.clear();
  for (const p of problems) {
    bank.set(p.id, {
      id: p.id,
      slug: p.slug,
      title: p.title,
      statement: p.statement,
      rating: p.rating,
      timeLimitMs: p.time_limit_ms,
      memoryLimitKb: p.memory_limit_kb,
      minutes: p.duel_minutes,
      samples: [],
      tests: [],
    });
  }
  for (const c of cases) {
    const problem = bank.get(c.problem_id);
    if (!problem) continue;
    problem.tests.push({ input: c.input, expected: c.expected });
    if (c.is_sample)
      problem.samples.push({ input: c.input, output: c.expected });
  }
  for (const [id, problem] of bank) {
    if (problem.tests.length === 0) bank.delete(id); // a problem nobody can be judged on is not served
  }
  if (bank.size === 0)
    throw new Error("no problems loaded; run: node scripts/problems.js seed");
  return bank.size;
}

export const getProblem = (id) => bank.get(id);

// What a player may see. Hidden tests and the other fields stay on the server.
export const publicProblem = (p) => ({
  title: p.title,
  statement: p.statement,
  samples: p.samples,
  timeLimitMs: p.timeLimitMs,
  memoryMb: Math.round(p.memoryLimitKb / 1024),
  minutes: p.minutes,
});

// Nearest in rating to the two players' average, preferring ones neither played lately.
export function pickProblem(average, recentIds) {
  const all = [...bank.values()];
  const fresh = all.filter((p) => !recentIds.has(p.id));
  const candidates = fresh.length > 0 ? fresh : all;
  const near = candidates.filter((p) => Math.abs(p.rating - average) <= BAND);
  if (near.length > 0) return near[Math.floor(Math.random() * near.length)];
  return candidates.reduce((best, p) =>
    Math.abs(p.rating - average) < Math.abs(best.rating - average) ? p : best,
  );
}
