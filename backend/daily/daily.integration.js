// Runs the daily challenge against a REAL MySQL database: the actual SQL for storing the pick
// and for finding the days a player solved it. It empties users, problems, daily_problems and
// practice_submissions first, so it refuses to run unless DB_NAME ends in "_test".
// Setup and run: see the top of account/account.integration.js.
import test from "node:test";
import assert from "node:assert/strict";

const SAFE = /_test$/.test(process.env.DB_NAME ?? "");
const skip = SAFE ? false : "set DB_NAME to a database ending in _test (see account/account.integration.js)";
const { default: pool } = await import("../db/connection.js");
const { repo } = await import("./repo.js");
const { createDaily } = await import("./daily.js");
const { istDay } = await import("./days.js");

const at = (iso) => Date.parse(iso);

async function reset() {
  await pool.query("SET FOREIGN_KEY_CHECKS = 0");
  for (const table of ["practice_submissions", "daily_problems", "test_cases", "problems", "users"]) await pool.query(`DELETE FROM ${table}`);
  await pool.query("SET FOREIGN_KEY_CHECKS = 1");
}
async function addUser(name) {
  const [made] = await pool.execute("INSERT INTO users (email, username, email_verified_at) VALUES (?, ?, NOW())", [`${name}@x.dev`, name]);
  return made.insertId;
}
async function addProblem(slug) {
  const [made] = await pool.execute(
    "INSERT INTO problems (slug, title, statement, rating, time_limit_ms, memory_limit_kb, duel_minutes, tags) VALUES (?, ?, 's', 900, 1000, 262144, 20, 'arrays')",
    [slug, slug],
  );
  return made.insertId;
}
// A submission made at an exact moment.
const submit = (userId, problemId, verdict, iso) =>
  pool.execute(
    "INSERT INTO practice_submissions (user_id, problem_id, language_id, source, verdict, created_at) VALUES (?, ?, 71, 'x', ?, FROM_UNIXTIME(?))",
    [userId, problemId, verdict, Math.floor(at(iso) / 1000)],
  );

test("the pick is stored once; a second writer is ignored", { skip }, async () => {
  await reset();
  const a = await addProblem("a");
  const b = await addProblem("b");
  assert.equal(await repo.get(100), null);
  await repo.insertIgnore(100, a);
  await repo.insertIgnore(100, b);
  assert.equal(await repo.get(100), a);
  await repo.insertIgnore(101, b);
  assert.deepEqual(await repo.recentProblemIds(5), [b, a]);
});

test("solvedDays: Accepted on the daily problem, inside that IST day only", { skip }, async () => {
  await reset();
  const ada = await addUser("ada");
  const bob = await addUser("bob");
  const p = await addProblem("p");
  const other = await addProblem("other");
  const day = istDay(at("2026-10-21T04:00:00Z")); // 2026-10-21 in IST: 2026-10-20T18:30Z to 2026-10-21T18:30Z
  await repo.insertIgnore(day, p);
  await repo.insertIgnore(day + 1, other);

  await submit(ada, p, "Accepted", "2026-10-20T18:29:59Z"); // one second before the day: yesterday in IST
  assert.deepEqual(await repo.solvedDays(ada), []);
  await submit(ada, p, "Accepted", "2026-10-20T18:30:00Z"); // first second of the day
  assert.deepEqual(await repo.solvedDays(ada), [day]);
  await submit(ada, p, "Accepted", "2026-10-21T18:29:59Z"); // last second: still the same day, counted once
  assert.deepEqual(await repo.solvedDays(ada), [day]);
  await submit(ada, p, "Accepted", "2026-10-21T18:30:00Z"); // next day, but the problem was not that day's
  assert.deepEqual(await repo.solvedDays(ada), [day]);

  await submit(bob, p, "Wrong Answer", "2026-10-21T04:00:00Z");
  await submit(bob, p, "Judging", "2026-10-21T04:00:00Z");
  await submit(bob, other, "Accepted", "2026-10-21T04:00:00Z"); // right time, wrong problem
  assert.deepEqual(await repo.solvedDays(bob), []);
});

test("through the service: a streak across three days, from real rows", { skip }, async () => {
  await reset();
  const ada = await addUser("ada");
  const ids = [await addProblem("p1"), await addProblem("p2"), await addProblem("p3")];
  const bank = { problemIds: () => ids, getProblem: (id) => ({ id, slug: `s${id}`, title: "t", topic: "arrays", rating: 900, difficulty: "Easy" }) };
  const today = istDay(at("2026-10-21T04:00:00Z"));
  for (let i = 0; i < 3; i++) await repo.insertIgnore(today - 2 + i, ids[i]);
  await submit(ada, ids[0], "Accepted", "2026-10-19T04:00:00Z");
  await submit(ada, ids[1], "Accepted", "2026-10-20T04:00:00Z");
  await submit(ada, ids[2], "Accepted", "2026-10-21T04:00:00Z");
  const daily = createDaily({ repo, bank, now: () => at("2026-10-21T05:00:00Z") });
  const result = await daily.today(ada);
  assert.equal(result.solvedToday, true);
  assert.deepEqual(result.streak, { current: 3, longest: 3 });
  assert.equal(result.problem.slug, `s${ids[2]}`);
});

test.after(() => pool.end());
