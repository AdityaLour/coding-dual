import test from "node:test";
import assert from "node:assert/strict";
import { CYCLE, SEGMENTS, demoFrame, formatClock, segmentList } from "./demo.js";

test("clock formats minutes and seconds", () => {
  assert.equal(formatClock(1500), "25:00");
  assert.equal(formatClock(1080), "18:00");
  assert.equal(formatClock(61), "01:01");
});

test("a loop starts fresh", () => {
  const f = demoFrame(0);
  assert.equal(f.clock, "25:00");
  assert.equal(f.youSegments, 0);
  assert.equal(f.rivalSegments, 0);
  assert.equal(f.solved, false);
  assert.equal(f.result, false);
  assert.equal(demoFrame(CYCLE).clock, "25:00");
});

test("you finish first: the rival stops short and the result follows", () => {
  const done = demoFrame(90);
  assert.equal(done.youSegments, SEGMENTS);
  assert.ok(done.rivalSegments < SEGMENTS);
  assert.equal(done.solved, true);
  assert.equal(done.rivalWriting, false);
  assert.equal(done.result, true);
  assert.equal(done.clock, "18:00");
});

test("you are never full before you have solved it", () => {
  for (let k = 0; k < 80; k++) assert.ok(demoFrame(k).youSegments < SEGMENTS);
});

test("the clock only ever goes down within a loop", () => {
  let last = Infinity;
  for (let k = 0; k < CYCLE; k++) {
    const [m, s] = demoFrame(k).clock.split(":").map(Number);
    const secs = m * 60 + s;
    assert.ok(secs <= last);
    last = secs;
  }
});

test("segment list marks the first n as lit", () => {
  const list = segmentList(3);
  assert.equal(list.length, SEGMENTS);
  assert.deepEqual(list.map((s) => s.on).slice(0, 4), [true, true, true, false]);
});
