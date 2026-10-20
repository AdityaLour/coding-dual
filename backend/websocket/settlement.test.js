import test from "node:test";
import assert from "node:assert/strict";
import { applySettlement, PAIR_DAILY_CAP } from "./rating.js";

// A stand-in for one MySQL connection: answers the three kinds of statement and records the writes.
function fakeConn({ recent, status = "active" }) {
  const writes = [];
  return {
    writes,
    execute: async (sql, params) => {
      if (sql.includes("FOR UPDATE")) return [[{ id: 1, rating: 1200, duels_played: 12 }, { id: 2, rating: 1200, duels_played: 12 }]];
      if (sql.includes("COUNT(*)")) return [[{ n: recent }]];
      if (sql.startsWith("UPDATE duels")) { writes.push(["duel", params]); return [{ affectedRows: status === "active" ? 1 : 0 }]; }
      if (sql.startsWith("UPDATE users")) { writes.push(["user", params]); return [{ affectedRows: 1 }]; }
      throw new Error(`unexpected sql: ${sql}`);
    },
  };
}
const duel = { duelId: "d1", playerA: 1, playerB: 2 };

test("a normal duel moves both ratings and counts for both players", async () => {
  const conn = fakeConn({ recent: 0 });
  const result = await applySettlement(conn, duel, 1, "solved");
  assert.deepEqual(result, { a: { before: 1200, after: 1212 }, b: { before: 1200, after: 1188 } });
  assert.equal(conn.writes.filter(([kind]) => kind === "user").length, 2);
  assert.equal(conn.writes[0][1][2], 1); // rated = 1
});

test("after the pair cap, the duel is finished but unrated: nothing moves, nobody's count changes", async () => {
  const conn = fakeConn({ recent: PAIR_DAILY_CAP });
  const result = await applySettlement(conn, duel, 1, "solved");
  assert.deepEqual(result, { a: { before: 1200, after: 1200 }, b: { before: 1200, after: 1200 }, rated: false, capped: true });
  assert.equal(conn.writes.filter(([kind]) => kind === "user").length, 0);
  assert.equal(conn.writes[0][1][2], 0); // rated = 0
});

test("one under the cap still counts", async () => {
  const result = await applySettlement(fakeConn({ recent: PAIR_DAILY_CAP - 1 }), duel, 2, "forfeit");
  assert.equal(result.rated, undefined);
  assert.equal(result.b.after, 1212);
});

test("a duel that was already settled changes nothing", async () => {
  const conn = fakeConn({ recent: 0, status: "finished" });
  assert.equal(await applySettlement(conn, duel, 1, "solved"), null);
  assert.equal(conn.writes.filter(([kind]) => kind === "user").length, 0);
});
