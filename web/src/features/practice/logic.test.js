import test from "node:test";
import assert from "node:assert/strict";
import {
  filterProblems,
  nextUnsolved,
  progressBefore,
  progressOf,
  runSummary,
  solvedProblems,
  timeAgo,
  topicProgress,
  verdictLine,
} from "./logic.js";

const list = [
  { slug: "a", title: "A", topic: "graphs", rating: 800, difficulty: "Easy", solved: true, attempts: 2 },
  { slug: "b", title: "B", topic: "graphs", rating: 1300, difficulty: "Medium", solved: false, attempts: 1 },
  { slug: "c", title: "C", topic: "trees", rating: 1700, difficulty: "Hard", solved: false, attempts: 0 },
  { slug: "d", title: "D", topic: "trees", rating: 900, difficulty: "Easy", solved: true, attempts: 1 },
];

test("progress counts solved and total, overall and per difficulty", () => {
  const p = progressOf(list);
  assert.equal(p.solved, 2);
  assert.equal(p.total, 4);
  assert.deepEqual(p.by.Easy, { solved: 2, total: 2 });
  assert.deepEqual(p.by.Medium, { solved: 0, total: 1 });
  assert.deepEqual(p.by.Hard, { solved: 0, total: 1 });
});

test("progressBefore uses the slugs seen earlier, not the current flags", () => {
  const before = progressBefore(list, new Set(["a"]));
  assert.equal(before.solved, 1);
  assert.deepEqual(before.by.Easy, { solved: 1, total: 2 });
  assert.equal(progressBefore(list, new Set()).solved, 0);
});

test("topic progress", () => {
  assert.deepEqual(topicProgress(list), {
    graphs: { solved: 1, total: 2 },
    trees: { solved: 1, total: 2 },
  });
});

test("filters combine and keep the order", () => {
  const f = (o) => filterProblems(list, { difficulty: "All", topic: "all", hideSolved: false, ...o }).map((p) => p.slug);
  assert.deepEqual(f({}), ["a", "b", "c", "d"]);
  assert.deepEqual(f({ difficulty: "Easy" }), ["a", "d"]);
  assert.deepEqual(f({ topic: "trees" }), ["c", "d"]);
  assert.deepEqual(f({ topic: "trees", difficulty: "Easy" }), ["d"]);
  assert.deepEqual(f({ hideSolved: true }), ["b", "c"]);
  assert.deepEqual(f({ topic: "nope" }), []);
});

test("nextUnsolved moves forward, wraps, and says null when nothing is left", () => {
  assert.equal(nextUnsolved(list, "a"), "b");
  assert.equal(nextUnsolved(list, "b"), "c");
  assert.equal(nextUnsolved(list, "c"), "b"); // wraps past the solved d and a
  const done = list.map((p) => ({ ...p, solved: true }));
  assert.equal(nextUnsolved(done, "a"), null);
  assert.equal(nextUnsolved([], "a"), null);
});

test("timeAgo", () => {
  const now = Date.parse("2026-10-20T12:00:00Z");
  const at = (secondsAgo) => new Date(now - secondsAgo * 1000).toISOString();
  assert.equal(timeAgo(at(5), now), "just now");
  assert.equal(timeAgo(at(120), now), "2 min ago");
  assert.equal(timeAgo(at(3 * 3600), now), "3 h ago");
  assert.equal(timeAgo(at(5 * 86400), now), "5 d ago");
  assert.equal(timeAgo("garbage", now), "");
});

test("verdict lines", () => {
  assert.deepEqual(verdictLine({ verdict: "Accepted" }), { name: "Accepted", detail: "all tests passed", good: true });
  assert.deepEqual(verdictLine({ verdict: "Wrong Answer", failedTest: 4 }), { name: "Wrong Answer", detail: "failed on test 4", good: false });
  assert.equal(verdictLine({ verdict: "Time Limit Exceeded", failedTest: null }).detail, "");
  const judge = verdictLine({ verdict: "Judge Error" });
  assert.equal(judge.good, false);
  assert.match(judge.detail, /not your code/);
});

test("run summaries", () => {
  const ok = { verdict: "Accepted", results: [{ verdict: "Accepted" }, { verdict: "Accepted" }] };
  assert.deepEqual(runSummary(ok), { name: "Examples passed", detail: "2 of 2", good: true });
  const bad = { verdict: "Wrong Answer", results: [{ verdict: "Accepted" }, { verdict: "Wrong Answer" }] };
  assert.equal(runSummary(bad).detail, "1 of 2 examples passed");
  assert.deepEqual(runSummary({ verdict: "Compilation Error", results: [] }), { name: "Compilation Error", detail: "", good: false });
});

test("solved problems come latest first, undated ones last", () => {
  const items = [
    { slug: "old", rating: 900, solved: true, solvedAt: "2026-10-01T00:00:00Z" },
    { slug: "new", rating: 1500, solved: true, solvedAt: "2026-10-20T00:00:00Z" },
    { slug: "none", rating: 800, solved: true, solvedAt: null },
    { slug: "open", rating: 700, solved: false, solvedAt: null },
  ];
  assert.deepEqual(solvedProblems(items).map((p) => p.slug), ["new", "old", "none"]);
});
