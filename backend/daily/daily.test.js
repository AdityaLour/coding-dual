import test from "node:test";
import assert from "node:assert/strict";
import { createDaily, DailyError } from "./daily.js";
import { istDay } from "./days.js";

const at = (iso) => Date.parse(iso);
const PROBLEMS = new Map([1, 2, 3, 4].map((id) => [id, { id, slug: `p${id}`, title: `Problem ${id}`, topic: "arrays", rating: 800 + id, difficulty: "Easy" }]));

function setup({ now = at("2026-10-21T04:00:00Z"), solved = [], problems = PROBLEMS } = {}) {
  const clock = { t: now };
  const rows = new Map();
  const calls = { get: 0, insert: 0 };
  const repo = {
    async get(day) { calls.get++; return rows.get(day) ?? null; },
    async insertIgnore(day, id) { calls.insert++; if (!rows.has(day)) rows.set(day, id); },
    async recentProblemIds(n) { return [...rows.entries()].sort((a, b) => b[0] - a[0]).slice(0, n).map(([, id]) => id); },
    async solvedDays() { return solved; },
  };
  const bank = { getProblem: (id) => problems.get(id), problemIds: () => [...problems.keys()].sort((a, b) => a - b) };
  return { daily: createDaily({ repo, bank, now: () => clock.t }), rows, calls, clock };
}

test("today gives the problem without hidden tests, the reset time and an empty streak", async () => {
  const { daily } = setup();
  const result = await daily.today(1);
  assert.match(result.problem.slug, /^p\d$/);
  assert.deepEqual(Object.keys(result.problem).sort(), ["difficulty", "rating", "slug", "title", "topic"]);
  assert.equal(result.now, at("2026-10-21T04:00:00Z"));
  assert.equal(result.date, "2026-10-21");
  assert.equal(new Date(result.resetsAt).toISOString(), "2026-10-21T18:30:00.000Z");
  assert.equal(result.solvedToday, false);
  assert.deepEqual(result.streak, { current: 0, longest: 0 });
});

test("everyone gets the same problem, and the pick is stored once and reused", async () => {
  const { daily, calls, rows } = setup();
  const a = await daily.today(1);
  const b = await daily.today(2);
  assert.equal(a.problem.slug, b.problem.slug);
  assert.equal(rows.size, 1);
  assert.equal(calls.insert, 1);
  assert.equal(calls.get, 2); // read, then re-read after writing; the second request used the cache
});

test("the pick for a day already stored wins, even if the maths would choose another", async () => {
  const { daily, rows } = setup();
  rows.set(istDay(at("2026-10-21T04:00:00Z")), 4);
  assert.equal((await daily.today(1)).problem.slug, "p4");
});

test("the problem changes when the IST day changes, and not before", async () => {
  const { daily, clock, rows } = setup({ now: at("2026-10-21T18:29:00Z") });
  await daily.today(1);
  clock.t = at("2026-10-21T18:31:00Z");
  await daily.today(1);
  assert.equal(rows.size, 2);
});

test("a problem is not repeated while others are available", async () => {
  const { daily, clock, rows } = setup({ now: at("2026-10-21T04:00:00Z") });
  for (let i = 0; i < 4; i++) {
    await daily.today(1);
    clock.t += 86_400_000;
  }
  assert.equal(new Set(rows.values()).size, 4);
});

test("a one-problem bank repeats it rather than failing", async () => {
  const { daily, clock } = setup({ problems: new Map([[1, PROBLEMS.get(1)]]) });
  const first = await daily.today(1);
  clock.t += 86_400_000;
  assert.equal((await daily.today(1)).problem.slug, first.problem.slug);
});

test("solved days give the streak, today's flag and the week squares (Mon-Sun)", async () => {
  const today = istDay(at("2026-10-21T04:00:00Z")); // a Wednesday
  const { daily } = setup({ solved: [today - 2, today - 1, today] });
  const result = await daily.today(1);
  assert.equal(result.solvedToday, true);
  assert.deepEqual(result.streak, { current: 3, longest: 3 });
  assert.equal(result.week.today, 2);
  assert.deepEqual(result.week.solved, [true, true, true, false, false, false, false]);
});

test("a day solved last week is not in this week's squares but counts toward the streak", async () => {
  const today = istDay(at("2026-10-19T04:00:00Z")); // a Monday
  const { daily } = setup({ now: at("2026-10-19T04:00:00Z"), solved: [today - 1, today - 2] });
  const result = await daily.today(1);
  assert.deepEqual(result.week.solved, [false, false, false, false, false, false, false]);
  assert.deepEqual(result.streak, { current: 2, longest: 2 });
});

test("a stored problem that has left the bank is a 503, not a crash", async () => {
  const { daily, rows } = setup();
  rows.set(istDay(at("2026-10-21T04:00:00Z")), 99);
  await assert.rejects(() => daily.today(1), (error) => error instanceof DailyError && error.status === 503);
});
