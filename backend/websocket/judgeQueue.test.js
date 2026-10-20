import test from "node:test";
import assert from "node:assert/strict";
import { asPractice, createQueue } from "./judgeQueue.js";

// Takes every slot, then lets the test queue up waiters and release them one at a time.
async function setup(slots = 1, ageMs = 8000) {
  let time = 0;
  const queue = createQueue(slots, ageMs, () => time);
  for (let i = 0; i < slots; i++) await queue.acquire("duel");
  const order = [];
  const wait = (kind, label) => queue.acquire(kind).then(() => order.push(label));
  return {
    queue,
    order,
    wait,
    advance: (ms) => (time += ms),
    flush: () => new Promise((resolve) => setImmediate(resolve)),
  };
}

test("a free slot is handed out at once", async () => {
  const queue = createQueue(2);
  await queue.acquire("practice");
  await queue.acquire("duel");
  assert.equal(queue.stats().free, 0);
  queue.release();
  queue.release();
  assert.equal(queue.stats().free, 2);
});

test("a waiting duel call goes before a waiting practice call", async () => {
  const t = await setup();
  t.wait("practice", "p1");
  t.wait("duel", "d1");
  t.queue.release();
  await t.flush();
  assert.deepEqual(t.order, ["d1"]);
  t.queue.release();
  await t.flush();
  assert.deepEqual(t.order, ["d1", "p1"]);
});

test("practice runs at once when no duel call is waiting", async () => {
  const t = await setup();
  t.wait("practice", "p1");
  t.queue.release();
  await t.flush();
  assert.deepEqual(t.order, ["p1"]);
});

test("a young practice call keeps waiting behind a stream of duel calls", async () => {
  const t = await setup();
  t.wait("practice", "p1");
  for (let i = 1; i <= 5; i++) t.wait("duel", `d${i}`);
  for (let i = 0; i < 5; i++) t.queue.release();
  await t.flush();
  assert.deepEqual(t.order, ["d1", "d2", "d3", "d4", "d5"]);
});

test("an aged practice call jumps in after two duel calls, then duels continue", async () => {
  const t = await setup();
  t.wait("practice", "p1");
  for (let i = 1; i <= 5; i++) t.wait("duel", `d${i}`);
  t.advance(8000);
  for (let i = 0; i < 6; i++) {
    t.queue.release();
    await t.flush();
  }
  assert.deepEqual(t.order, ["d1", "d2", "p1", "d3", "d4", "d5"]);
});

test("aged practice calls cannot take more than every third slot while duels wait", async () => {
  const t = await setup();
  for (let i = 1; i <= 4; i++) t.wait("practice", `p${i}`);
  for (let i = 1; i <= 8; i++) t.wait("duel", `d${i}`);
  t.advance(60_000);
  for (let i = 0; i < 9; i++) {
    t.queue.release();
    await t.flush();
  }
  assert.deepEqual(t.order, ["d1", "d2", "p1", "d3", "d4", "p2", "d5", "d6", "p3"]);
});

test("asPractice marks every call made inside it, including after awaits", async () => {
  const queue = createQueue(1);
  await queue.acquire("duel");
  const order = [];
  const inside = asPractice(async () => {
    await Promise.resolve();
    await queue.acquire().then(() => order.push("practice"));
  });
  queue.acquire().then(() => order.push("duel"));
  queue.release();
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(order, ["duel"]); // the duel call outranks the practice call queued first
  queue.release();
  await inside;
  assert.deepEqual(order, ["duel", "practice"]);
});
