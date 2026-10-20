import test from "node:test";
import assert from "node:assert/strict";
import { poll, PollTimeout } from "./poll.js";

const instant = async () => {};

test("returns the first final answer, asking again until then", async () => {
  let calls = 0;
  const value = await poll(async () => ++calls, (n) => n === 3, { sleep: instant });
  assert.equal(value, 3);
  assert.equal(calls, 3);
});

test("a brief server failure is retried; a real answer error is not", async () => {
  let calls = 0;
  const flaky = async () => {
    if (++calls < 3) throw Object.assign(new Error("down"), { status: 503 });
    return "done";
  };
  assert.equal(await poll(flaky, (v) => v === "done", { sleep: instant }), "done");

  const missing = async () => {
    throw Object.assign(new Error("gone"), { status: 404 });
  };
  await assert.rejects(poll(missing, () => true, { sleep: instant }), /gone/);
});

test("gives up after too many failures in a row", async () => {
  let calls = 0;
  const down = async () => {
    calls++;
    throw Object.assign(new Error("down"), { status: 0 });
  };
  await assert.rejects(poll(down, () => true, { sleep: instant, retries: 2 }), /down/);
  assert.equal(calls, 3);
});

test("times out", async () => {
  let t = 0;
  await assert.rejects(
    poll(async () => "pending", () => false, { sleep: instant, timeoutMs: 100, now: () => (t += 60) }),
    PollTimeout,
  );
});

test("stops when aborted", async () => {
  const controller = new AbortController();
  let calls = 0;
  const promise = poll(
    async () => {
      if (++calls === 2) controller.abort();
      return "pending";
    },
    () => false,
    { signal: controller.signal, intervalMs: 5 },
  );
  await assert.rejects(promise, (e) => e.name === "AbortError");
});
