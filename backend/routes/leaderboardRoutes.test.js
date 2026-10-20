import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { createLeaderboardRouter } from "./leaderboardRoutes.js";
import { handleErrors } from "../middleware/errorHandler.js";

async function serve(leaderboard, user = { id: 4, username: "ada" }) {
  const app = express();
  app.use("/api/leaderboard", createLeaderboardRouter(leaderboard, [(req, res, next) => ((req.user = user), next())]));
  app.use(handleErrors);
  const server = await new Promise((resolve) => { const s = app.listen(0, () => resolve(s)); });
  return { base: `http://127.0.0.1:${server.address().port}/api/leaderboard`, close: () => server.close() };
}

test("the board is read for the signed-in user, never for an id in the URL", async () => {
  const asked = [];
  const { base, close } = await serve({ board: async (id) => (asked.push(id), { all: { total: 0, entries: [] } }), rankOf: async () => 3 });
  try {
    const res = await fetch(`${base}/?userId=99`);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { all: { total: 0, entries: [] } });
    assert.deepEqual(asked, [4]);
    assert.deepEqual(await (await fetch(`${base}/rank`)).json(), { rank: 3 });
  } finally { close(); }
});

test("a failing database is a 500 with no details", async () => {
  const { base, close } = await serve({ board: async () => { throw new Error("db down: secret"); }, rankOf: async () => null });
  const log = console.error; console.error = () => {};
  try {
    const res = await fetch(`${base}/`);
    assert.equal(res.status, 500);
    assert.ok(!JSON.stringify(await res.json()).includes("secret"));
  } finally { console.error = log; close(); }
});
