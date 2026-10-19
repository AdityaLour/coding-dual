import test from "node:test";
import assert from "node:assert/strict";
import { runTests } from "./judge.js";
import { JUDGE_SLOTS } from "./limits.js";

// A stand-in for Judge0 that reports how many calls were in flight at once.
function fakeJudge0() {
  const stats = { inFlight: 0, peak: 0, calls: 0 };
  globalThis.fetch = async (url, options) => {
    if (options.method !== "POST") return { ok: true, json: async () => ({}) }; // the clean-up DELETE
    stats.calls++;
    stats.peak = Math.max(stats.peak, ++stats.inFlight);
    await new Promise((resolve) => setTimeout(resolve, 15));
    stats.inFlight--;
    return {
      ok: true,
      json: async () => ({
        token: "t",
        status: { id: 3 },
        stdout: Buffer.from("42\n").toString("base64"),
        time: "0.01",
      }),
    };
  };
  return stats;
}

const problem = {
  timeLimitMs: 1000,
  memoryLimitKb: 256000,
  tests: Array.from({ length: 6 }, () => ({ input: "1\n", expected: "42\n" })),
};

test("several duels judging at once never put more than JUDGE_SLOTS calls on Judge0", async () => {
  const stats = fakeJudge0();
  const outcomes = await Promise.all(
    [1, 2, 3, 4].map(() => runTests(problem, 71, "print(42)")),
  );
  assert.ok(outcomes.every((outcome) => outcome.verdict === "Accepted"));
  assert.equal(stats.calls, 24);
  assert.ok(stats.peak <= JUDGE_SLOTS, `peak ${stats.peak}`);
  assert.ok(stats.peak > 1, "the slots are actually used in parallel");
});

test("a Judge0 failure frees its slot instead of leaking it", async () => {
  globalThis.fetch = async (url, options) =>
    options.method === "POST" ? { ok: false, status: 500 } : { ok: true };
  for (let i = 0; i < JUDGE_SLOTS * 3; i++) {
    assert.equal((await runTests(problem, 71, "x")).verdict, "Judge Error");
  }
  const stats = fakeJudge0();
  assert.equal((await runTests(problem, 71, "print(42)")).verdict, "Accepted");
  assert.equal(stats.calls, 6);
});
