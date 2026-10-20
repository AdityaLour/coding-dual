import test from "node:test";
import assert from "node:assert/strict";
import { actFrame, clamp, ease, sceneFrame, STATIC_ACT } from "./scene.js";

const base = {
  y: 0, vh: 800, actTop: 0, actH: 4000, stageH: 800,
  pracTop: 4000, pracH: 600, rateTop: 4700, finTop: 5800, finH: 600, flat: false, calm: false,
};

test("clamp and ease stay inside 0..1", () => {
  assert.equal(clamp(-4), 0);
  assert.equal(clamp(9), 1);
  assert.equal(ease(0), 0);
  assert.equal(ease(1), 1);
  assert.equal(ease(0.5), 0.5);
});

test("act: starts closed, ends open with the last word lit", () => {
  const start = actFrame(0);
  assert.equal(start.d, 0);
  assert.equal(start.bo, 0);

  const end = actFrame(1);
  assert.equal(end.d, 1);
  assert.equal(end.bo, 1);
  assert.equal(end.o[2], 1);
  assert.equal(end.o[0], 0.18);
});

test("act: the words light up one after another", () => {
  const lit = (p) => actFrame(p).o.map((v) => Math.round(v * 100));
  const first = lit(0.5);
  const second = lit(0.68);
  const third = lit(0.9);
  assert.ok(first[0] > first[1] && first[0] > first[2]);
  assert.ok(second[1] > second[0] && second[1] > second[2]);
  assert.ok(third[2] > third[0] && third[2] > third[1]);
});

test("the poster opens with the scroll and never goes backwards", () => {
  let last = -1;
  for (let y = 0; y <= 3200; y += 100) {
    const { act } = sceneFrame({ ...base, y });
    assert.ok(act.d >= last);
    last = act.d;
  }
  assert.equal(last, 1);
});

test("flat pages skip the pinned act but keep the rest moving", () => {
  const f = sceneFrame({ ...base, y: 4500, flat: true });
  assert.deepEqual(f.act, STATIC_ACT);
  assert.ok(f.prac > 0 && f.prac < 1);
});

test("reduced motion gets the finished page", () => {
  const f = sceneFrame({ ...base, y: 2000, calm: true });
  assert.deepEqual(f.act, STATIC_ACT);
  assert.equal(f.rate, 1);
  assert.equal(f.rating, 1218);
  assert.equal(f.fin, 1);
});

test("rating counts from 1200 to 1218 as the section arrives", () => {
  assert.equal(sceneFrame({ ...base, y: 3000 }).rating, 1200);
  assert.equal(sceneFrame({ ...base, y: 5400 }).rating, 1218);
  const mid = sceneFrame({ ...base, y: 4500 }).rating;
  assert.ok(mid >= 1200 && mid <= 1218);
});

test("the closing words are fully in place when the page ends, even on a short closing section", () => {
  const f = sceneFrame({ ...base, vh: 768, finTop: 5900, finH: 600, y: 5900 + 600 - 768 });
  assert.equal(f.fin, 1);
});
