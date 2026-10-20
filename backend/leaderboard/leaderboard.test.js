import test from "node:test";
import assert from "node:assert/strict";
import { createLeaderboard } from "./leaderboard.js";

function setup(start = Date.UTC(2026, 9, 21, 6, 30)) {
  const calls = { all: 0, week: 0 };
  let clock = start;
  const rows = Array.from({ length: 60 }, (_, i) => ({
    id: i + 1, username: `u${i + 1}`, rating: 2000 - i * 10, duels: 8, wins: 5, losses: 2,
  }));
  const repo = {
    allTimeRows: async () => (calls.all++, await new Promise((r) => setTimeout(r, 5)), rows),
    weeklyRows: async () => (calls.week++, [{ id: 3, username: "u3", rating: 1980, duels: 8, gain: 25, weekDuels: 4, weekWins: 3 }]),
    userRow: async (id) => (id === 99 ? { id: 99, username: "newbie", rating: 1230, duels: 2 } : rows.find((r) => r.id === id)),
    userWeek: async () => null,
  };
  const board = createLeaderboard({ repo, now: () => clock, snapshotMs: 30_000 });
  return { board, calls, tick: (ms) => (clock += ms) };
}

test("both boards come back together, top 50 only, with the viewer marked", async () => {
  const { board } = setup();
  const result = await board.board(7);
  assert.equal(result.all.total, 60);
  assert.equal(result.all.entries.length, 50);
  assert.equal(result.all.entries.find((e) => e.isMe).username, "u7");
  assert.deepEqual(result.week.entries.map((e) => [e.rank, e.username, e.gain]), [[1, "u3", 25]]);
  assert.equal(result.me.rank, 7);
  assert.equal(result.weeklyMinDuels, 3);
  assert.equal(result.now, Date.UTC(2026, 9, 21, 6, 30));
  assert.ok(!("id" in result.all.entries[0]) && !("email" in result.all.entries[0]));
});

test("someone outside the top 50 still gets their own rank", async () => {
  const { board } = setup();
  const result = await board.board(58);
  assert.equal(result.all.entries.some((e) => e.isMe), false);
  assert.equal(result.me.rank, 58);
  assert.equal(result.me.next.username, "u57");
});

test("a player still placing has no rank but sees their count", async () => {
  const { board } = setup();
  const { me } = await board.board(99);
  assert.equal(me.rank, null);
  assert.equal(me.placing, 2);
});

test("many requests at once, and requests within 30 s, share one snapshot", async () => {
  const { board, calls, tick } = setup();
  await Promise.all([board.board(1), board.board(2), board.board(3), board.rankOf(4)]);
  assert.deepEqual(calls, { all: 1, week: 1 });
  tick(29_000);
  await board.board(1);
  assert.equal(calls.all, 1);
  tick(2_000);
  await board.board(1);
  assert.equal(calls.all, 2);
});

test("when the week turns over, the snapshot is rebuilt even if it is only seconds old", async () => {
  // 10 seconds before Monday 00:00 IST (= Sunday 18:30 UTC)
  const { board, calls, tick } = setup(Date.UTC(2026, 9, 18, 18, 29, 50));
  await board.board(1);
  tick(5_000);
  await board.board(1);
  assert.equal(calls.all, 1); // same week, young snapshot
  tick(10_000); // now past midnight
  await board.board(1);
  assert.equal(calls.all, 2);
});

test("rankOf answers from the snapshot alone", async () => {
  const { board } = setup();
  assert.equal(await board.rankOf(3), 3);
  assert.equal(await board.rankOf(404), null);
});
