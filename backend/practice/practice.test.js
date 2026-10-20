import test from "node:test";
import assert from "node:assert/strict";
import { createPractice, PracticeError, LIMITS } from "./practice.js";

const PROBLEM = {
  id: 7,
  slug: "two-sum",
  samples: [{ input: "1\n", output: "2\n" }],
};

// An in-memory stand-in for the MySQL repo.
function fakeRepo() {
  const rows = [];
  return {
    rows,
    async insert(userId, problemId, languageId, source) {
      rows.push({
        id: rows.length + 1, user_id: userId, problem_id: problemId, language_id: languageId,
        source, verdict: "Judging", failed_test: null, runtime_ms: null, created_at: new Date(),
      });
      return rows.length;
    },
    async finish(id, { verdict, failedTest, runtimeMs }) {
      Object.assign(rows[id - 1], { verdict, failed_test: failedTest ?? null, runtime_ms: runtimeMs ?? null });
    },
    async get(id, userId) {
      const row = rows[id - 1];
      return row && row.user_id === userId ? row : null;
    },
    async history(userId, problemId, limit) {
      return rows.filter((r) => r.user_id === userId && r.problem_id === problemId).reverse().slice(0, limit);
    },
    async progress(userId) {
      const mine = rows.filter((r) => r.user_id === userId && r.verdict !== "Judging");
      return [...new Set(mine.map((r) => r.problem_id))].map((problemId) => ({
        slug: "two-sum",
        solved: mine.some((r) => r.problem_id === problemId && r.verdict === "Accepted") ? 1 : 0,
        solved_at: mine.filter((r) => r.problem_id === problemId && r.verdict === "Accepted").at(-1)?.created_at ?? null,
        attempts: mine.filter((r) => r.problem_id === problemId).length,
      }));
    },
    async countLastDay(userId) {
      return rows.filter((r) => r.user_id === userId).length;
    },
  };
}

// judge.runTests / runExamples that finish when the test says so.
function setup({ inDuel = () => false, limits = LIMITS } = {}) {
  const clock = { t: 1_000_000 };
  const repo = fakeRepo();
  const gates = [];
  const hold = () => new Promise((resolve) => gates.push(resolve));
  const calls = { tests: 0, examples: 0 };
  const judge = {
    runTests: async () => {
      calls.tests++;
      await hold();
      return { verdict: "Accepted", failedTest: null, runtimeMs: 12 };
    },
    runExamples: async () => {
      calls.examples++;
      await hold();
      return { verdict: "Accepted", results: [{ verdict: "Accepted", ms: 5, output: "2\n" }] };
    },
  };
  const bank = {
    getProblemBySlug: (slug) => (slug === "two-sum" ? PROBLEM : undefined),
    catalogue: () => [
      { slug: "two-sum", title: "Two Sum", topic: "arrays", rating: 800, difficulty: "Easy" },
      { slug: "other", title: "Other", topic: "graphs", rating: 1500, difficulty: "Medium" },
    ],
    practiceProblem: (p) => ({ slug: p.slug, samples: p.samples }),
  };
  const practice = createPractice({ repo, judge, bank, inDuel, now: () => clock.t, limits });
  const finishAll = async () => {
    gates.splice(0).forEach((open) => open());
    await new Promise((resolve) => setImmediate(resolve));
    await new Promise((resolve) => setImmediate(resolve));
  };
  return { practice, repo, clock, calls, finishAll };
}

const code = { languageId: 71, source: "print(2)" };
const rejects = (promiseOrFn, status) =>
  assert.rejects(async () => (typeof promiseOrFn === "function" ? promiseOrFn() : promiseOrFn), (error) => {
    assert.ok(error instanceof PracticeError, String(error));
    assert.equal(error.status, status);
    return true;
  });

test("submit returns an id at once, judges in the background, then the verdict is readable", async () => {
  const { practice, finishAll } = setup();
  const { id } = await practice.submit(1, "two-sum", code);
  const pending = await practice.getSubmission(1, id);
  assert.equal(pending.verdict, "Judging");
  assert.equal(pending.done, false);
  assert.equal(pending.source, "print(2)");
  await finishAll();
  const done = await practice.getSubmission(1, id);
  assert.equal(done.verdict, "Accepted");
  assert.equal(done.done, true);
  assert.equal(done.runtimeMs, 12);
});

test("a judge crash becomes a Judge Error, not a stuck submission", async () => {
  const { repo } = setup();
  const crashing = createPractice({
    repo,
    judge: { runTests: async () => { throw new Error("boom"); }, runExamples: async () => ({}) },
    bank: { getProblemBySlug: () => PROBLEM, catalogue: () => [], practiceProblem: (p) => p },
    inDuel: () => false,
  });
  const error = console.error;
  console.error = () => {};
  try {
    const { id } = await crashing.submit(1, "two-sum", code);
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal((await crashing.getSubmission(1, id)).verdict, "Judge Error");
  } finally {
    console.error = error;
  }
});

test("unknown problem, bad language, empty or oversized source are refused", async () => {
  const { practice } = setup();
  await rejects(practice.submit(1, "nope", code), 404);
  await rejects(practice.submit(1, "two-sum", { languageId: 99, source: "x" }), 400);
  await rejects(practice.submit(1, "two-sum", { languageId: 71, source: "" }), 400);
  await rejects(practice.submit(1, "two-sum", { languageId: 71, source: 5 }), 400);
  await rejects(practice.submit(1, "two-sum", { languageId: 71, source: "x".repeat(LIMITS.maxSourceBytes + 1) }), 400);
});

test("nobody practises during a duel", async () => {
  const { practice } = setup({ inDuel: () => true });
  await rejects(practice.submit(1, "two-sum", code), 409);
  await rejects(() => practice.run(1, "two-sum", code), 409);
  await rejects(() => practice.open(1, "two-sum"), 409);
});

test("one judging at a time per user; another user is unaffected", async () => {
  const { practice, clock, finishAll } = setup();
  await practice.submit(1, "two-sum", code);
  clock.t += LIMITS.gapMs + 1;
  await rejects(practice.submit(1, "two-sum", code), 409);
  await rejects(() => practice.run(1, "two-sum", code), 409);
  await practice.submit(2, "two-sum", code);
  await finishAll();
  await practice.submit(1, "two-sum", code); // free again once the first finished
});

test("two simultaneous submits from one user: only one gets in", async () => {
  const { practice } = setup();
  const results = await Promise.allSettled([
    practice.submit(1, "two-sum", code),
    practice.submit(1, "two-sum", code),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
});

test("a few seconds must pass between submissions", async () => {
  const { practice, clock, finishAll } = setup();
  await practice.submit(1, "two-sum", code);
  await finishAll();
  await rejects(practice.submit(1, "two-sum", code), 429);
  clock.t += LIMITS.gapMs - 1;
  await rejects(practice.submit(1, "two-sum", code), 429);
  clock.t += 1;
  await practice.submit(1, "two-sum", code);
});

test("daily cap on submissions", async () => {
  const { practice, clock, finishAll } = setup({ limits: { ...LIMITS, dailyCap: 2 } });
  for (let i = 0; i < 2; i++) {
    await practice.submit(1, "two-sum", code);
    await finishAll();
    clock.t += LIMITS.gapMs + 1;
  }
  await rejects(practice.submit(1, "two-sum", code), 429);
});

test("when the whole judge is busy the user is told to try again", async () => {
  const { practice } = setup({ limits: { ...LIMITS, maxJudging: 2 } });
  await practice.submit(1, "two-sum", code);
  await practice.submit(2, "two-sum", code);
  await rejects(practice.submit(3, "two-sum", code), 503);
});

test("a failed insert frees the user to try again", async () => {
  const { practice, repo, clock } = setup();
  const insert = repo.insert;
  repo.insert = async () => { throw new Error("db down"); };
  await assert.rejects(practice.submit(1, "two-sum", code), /db down/);
  repo.insert = insert;
  clock.t += LIMITS.gapMs + 1;
  await practice.submit(1, "two-sum", code);
});

test("run: results come back by id, only to their owner, and nothing is stored", async () => {
  const { practice, repo, finishAll } = setup();
  const { id } = practice.run(1, "two-sum", code);
  assert.equal(practice.getRun(1, id).status, "judging");
  await finishAll();
  const done = practice.getRun(1, id);
  assert.equal(done.status, "done");
  assert.equal(done.verdict, "Accepted");
  assert.equal(done.results[0].output, "2\n");
  assert.equal("userId" in done, false);
  assert.throws(() => practice.getRun(2, id), (e) => e.status === 404);
  assert.equal(repo.rows.length, 0);
});

test("submissions are private: another user's id is a 404", async () => {
  const { practice } = setup();
  const { id } = await practice.submit(1, "two-sum", code);
  await rejects(practice.getSubmission(2, id), 404);
  await rejects(practice.getSubmission(1, "abc"), 404);
  await rejects(practice.getSubmission(1, "999"), 404);
});

test("list shows solved and attempts; history has no source", async () => {
  const { practice, clock, finishAll } = setup();
  await practice.submit(1, "two-sum", code);
  await finishAll();
  clock.t += LIMITS.gapMs + 1;
  const list = await practice.list(1);
  assert.deepEqual(list.map((p) => [p.slug, p.solved, p.attempts]), [["two-sum", true, 1], ["other", false, 0]]);
  assert.ok(list[0].solvedAt instanceof Date, "a solved problem says when");
  assert.equal(list[1].solvedAt, null);
  const history = await practice.history(1, "two-sum");
  assert.equal(history.length, 1);
  assert.equal("source" in history[0], false);
  assert.equal((await practice.list(2))[0].solved, false);
});

test("open serves the practice view of the problem", () => {
  const { practice } = setup();
  assert.deepEqual(practice.open(1, "two-sum"), { slug: "two-sum", samples: PROBLEM.samples });
});
