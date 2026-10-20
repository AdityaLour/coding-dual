import test from "node:test";
import assert from "node:assert/strict";
import { dayDate, dayEndsAt, istDay, pickId, streaks, weekdayOf } from "./days.js";

const utc = (iso) => Date.parse(iso);

test("the day changes at midnight IST, which is 18:30 UTC", () => {
  assert.equal(istDay(utc("2026-10-20T18:29:59Z")), istDay(utc("2026-10-20T00:00:00Z")));
  assert.equal(istDay(utc("2026-10-20T18:30:00Z")), istDay(utc("2026-10-20T00:00:00Z")) + 1);
  assert.equal(dayDate(istDay(utc("2026-10-20T18:30:00Z"))), "2026-10-21");
  assert.equal(dayDate(istDay(utc("2026-10-20T18:29:59Z"))), "2026-10-20");
});

test("a day ends exactly where the next one starts", () => {
  const day = istDay(utc("2026-10-20T10:00:00Z"));
  assert.equal(new Date(dayEndsAt(day)).toISOString(), "2026-10-20T18:30:00.000Z");
  assert.equal(istDay(dayEndsAt(day) - 1), day);
  assert.equal(istDay(dayEndsAt(day)), day + 1);
});

test("weekdays: 2026-10-19 is a Monday, 2026-10-25 a Sunday", () => {
  assert.equal(weekdayOf(istDay(utc("2026-10-19T06:00:00Z"))), 0);
  assert.equal(weekdayOf(istDay(utc("2026-10-25T06:00:00Z"))), 6);
  assert.equal(weekdayOf(0), 3); // 1970-01-01 was a Thursday
});

test("pickId is the same every time for a day, and always one of the ids", () => {
  const ids = [3, 5, 8, 13, 21];
  assert.equal(pickId(20_000, ids), pickId(20_000, ids));
  for (let day = 20_000; day < 20_200; day++) assert.ok(ids.includes(pickId(day, ids)));
  assert.equal(pickId(1, []), null);
});

test("pickId spreads over the ids rather than sticking to a few", () => {
  const ids = Array.from({ length: 10 }, (_, i) => i + 1);
  const seen = new Set();
  for (let day = 20_000; day < 20_300; day++) seen.add(pickId(day, ids));
  assert.equal(seen.size, 10);
});

test("streaks: counts back from today", () => {
  assert.deepEqual(streaks(new Set([8, 9, 10]), 10), { current: 3, longest: 3 });
});

test("streaks: today not solved yet keeps yesterday's streak alive", () => {
  assert.deepEqual(streaks(new Set([7, 8, 9]), 10), { current: 3, longest: 3 });
});

test("streaks: a missed day ends the current streak, but longest remembers", () => {
  assert.deepEqual(streaks(new Set([1, 2, 3, 4, 8, 9]), 10), { current: 2, longest: 4 });
  assert.deepEqual(streaks(new Set([1, 2, 3, 4, 7]), 10), { current: 0, longest: 4 });
});

test("streaks: nothing solved", () => {
  assert.deepEqual(streaks(new Set(), 10), { current: 0, longest: 0 });
});
