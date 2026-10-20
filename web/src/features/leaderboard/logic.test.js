import test from "node:test";
import assert from "node:assert/strict";
import { boardOf, countdown, countdownText, footText, gainText, leadText, pinView, weekFraction } from "./logic.js";

const data = { placementDuels: 5, weeklyMinDuels: 3 };
const me = (o = {}) => ({ placing: null, rank: 23, rating: 1612, week: { rank: 9, gain: 64, duels: 5, qualified: true }, ...o });

test("gains read plainly, with a real minus sign", () => {
  assert.equal(gainText(96), "+96");
  assert.equal(gainText(-12), "−12");
  assert.equal(gainText(0), "0");
});

test("the countdown splits into days, hours, minutes and seconds and never goes negative", () => {
  assert.deepEqual(countdown(5 * 86400e3 + 10 * 3600e3 + 50 * 60e3 + 12e3), { d: 5, h: 10, m: 50, s: 12 });
  assert.equal(countdownText({ d: 5, h: 4, m: 5, s: 9 }), "5d 04h 05m 09s");
  assert.deepEqual(countdown(-5000), { d: 0, h: 0, m: 0, s: 0 });
});

test("the week progress is clamped between 0 and 1", () => {
  assert.equal(weekFraction(50, 0, 100), 0.5);
  assert.equal(weekFraction(-5, 0, 100), 0);
  assert.equal(weekFraction(500, 0, 100), 1);
});

test("the text under the heading follows the period", () => {
  assert.match(leadText("all", 3), /duel rating/);
  assert.match(leadText("week", 3), /3 duels this week/);
  assert.equal(footText("all", 50, 214), "Top 50 of 214 ranked. Updates about once a minute.");
  assert.match(footText("week", 12, 12), /ranked this week/);
});

test("the periods pick their own board", () => {
  const d = { all: { total: 1 }, week: { total: 2 } };
  assert.equal(boardOf(d, "all").total, 1);
  assert.equal(boardOf(d, "week").total, 2);
});

test("pinned bar: someone still placing sees their count", () => {
  const v = pinView(me({ placing: 3, rank: null }), "all", undefined, { total: 0 }, data);
  assert.deepEqual(v, { rank: "3/5", sub: "2 more rated duels to join the board", value: null, canJump: false });
});

test("pinned bar: in the list it can jump to the row; outside the top 50 it shows the rank and total", () => {
  const board = { total: 214 };
  const mine = { rank: 23, wins: 31, losses: 20 };
  assert.deepEqual(pinView(me(), "all", mine, board, data), { rank: "#23", sub: "31–20", value: "1612", canJump: true });
  assert.deepEqual(pinView(me({ rank: 87 }), "all", undefined, board, data), { rank: "#87", sub: "of 214 ranked", value: "1612", canJump: false });
});

test("pinned bar, weekly: in the list, ranked beyond 50, or not enough duels yet", () => {
  const board = { total: 80 };
  assert.deepEqual(pinView(me(), "week", { rank: 9, gain: 64, weekDuels: 5 }, board, data), { rank: "#9", sub: "5 duels this week", value: "+64", canJump: true });
  assert.deepEqual(pinView(me({ week: { rank: 61, gain: 4, duels: 3, qualified: true } }), "week", undefined, board, data), { rank: "#61", sub: "of 80 this week", value: "+4", canJump: false });
  assert.deepEqual(pinView(me({ week: { rank: null, gain: 0, duels: 2, qualified: false } }), "week", undefined, board, data), { rank: "–", sub: "not ranked this week, 2 of 3 duels", value: null, canJump: false });
});
