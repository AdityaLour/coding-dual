import test from "node:test";
import assert from "node:assert/strict";
import { publicEntry, rankAllTime, rankWeekly, standing, weekBounds } from "./ranking.js";

const p = (id, o = {}) => ({ id, username: `p${id}`, rating: 1200, duels: 10, wins: 0, losses: 0, ...o });
const w = (id, o = {}) => ({ id, username: `p${id}`, rating: 1200, duels: 10, gain: 0, weekDuels: 3, weekWins: 0, ...o });

test("the week runs Monday 00:00 IST to the next Monday 00:00 IST", () => {
  // Wednesday 2026-10-21 12:00 IST -> the week started Monday 2026-10-19 00:00 IST
  const noon = Date.UTC(2026, 9, 21, 6, 30);
  const { start, end } = weekBounds(noon);
  assert.equal(new Date(start).toISOString(), "2026-10-18T18:30:00.000Z");
  assert.equal(new Date(end).toISOString(), "2026-10-25T18:30:00.000Z");
});

test("the week boundary: one millisecond before Monday IST is still last week", () => {
  const mondayStart = Date.UTC(2026, 9, 18, 18, 30);
  assert.equal(weekBounds(mondayStart - 1).end, mondayStart);
  assert.equal(weekBounds(mondayStart).start, mondayStart);
  // Sunday evening UTC is already Monday morning in India
  assert.equal(weekBounds(Date.UTC(2026, 9, 18, 19, 0)).start, mondayStart);
});

test("all-time: rating, then more wins, then whoever joined first; every rank is distinct", () => {
  const ranked = rankAllTime([
    p(5, { rating: 1500, wins: 3 }),
    p(2, { rating: 1500, wins: 3 }),
    p(7, { rating: 1500, wins: 9 }),
    p(1, { rating: 1600 }),
  ]);
  assert.deepEqual(ranked.map((r) => [r.id, r.rank]), [[1, 1], [7, 2], [2, 3], [5, 4]]);
});

test("placement: fewer than 5 rated duels, or no username, never appears", () => {
  const ranked = rankAllTime([p(1, { duels: 4, rating: 2000 }), p(2, { username: null, rating: 2100 }), p(3, { duels: 5 })]);
  assert.deepEqual(ranked.map((r) => r.id), [3]);
});

test("weekly: most points gained wins, and it needs 3 duels this week plus placement", () => {
  const ranked = rankWeekly([
    w(1, { gain: 40, weekDuels: 2 }), // too few this week
    w(2, { gain: 30 }),
    w(3, { gain: -5, weekDuels: 6 }),
    w(4, { gain: 60, duels: 4 }), // still placing
    w(5, { gain: 30, weekWins: 2 }), // ties 2 on gain, wins more
  ]);
  assert.deepEqual(ranked.map((r) => r.id), [5, 2, 3]);
});

test("a public entry carries no id or email, and picks one of five faces", () => {
  const entry = publicEntry({ ...p(13, { rating: 1400, wins: 3, losses: 2 }), rank: 4 }, 13);
  assert.deepEqual(entry, { rank: 4, username: "p13", face: 3, rating: 1400, isMe: true, wins: 3, losses: 2, duels: 10 });
  const weekly = publicEntry({ ...w(4, { gain: 12 }), rank: 1 }, 99);
  assert.deepEqual(weekly, { rank: 1, username: "p4", face: 4, rating: 1200, isMe: false, gain: 12, weekDuels: 3 });
});

test("standing: rank, points to pass the player above, weekly numbers", () => {
  const all = rankAllTime([p(1, { rating: 1700 }), p(2, { rating: 1650 }), p(3, { rating: 1600 })]);
  const weekly = rankWeekly([w(3, { gain: 20 }), w(1, { gain: 10 })]);
  const me = { id: 3, username: "p3", rating: 1600, duels: 10 };
  const s = standing(me, { gain: 20, weekDuels: 4 }, all, weekly);
  assert.equal(s.rank, 3);
  assert.deepEqual(s.next, { username: "p2", rank: 2, points: 51 });
  assert.deepEqual(s.week, { rank: 1, gain: 20, duels: 4, qualified: true });
  assert.equal(s.placing, null);
});

test("standing: first place has nobody above; a player still placing has no rank", () => {
  const all = rankAllTime([p(1, { rating: 1700 })]);
  assert.equal(standing({ id: 1, username: "p1", rating: 1700, duels: 10 }, null, all, []).next, null);
  const placing = standing({ id: 9, username: "p9", rating: 1230, duels: 3 }, { gain: 30, weekDuels: 3 }, all, []);
  assert.equal(placing.rank, null);
  assert.equal(placing.placing, 3);
  assert.deepEqual(placing.week, { rank: null, gain: 30, duels: 3, qualified: false });
});
