import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { createDailyRouter } from "./dailyRoutes.js";
import { DailyError } from "../daily/daily.js";
import { handleErrors } from "../middleware/errorHandler.js";

async function serve({ user = { id: 1, username: "ada" }, today } = {}) {
  const seen = [];
  const daily = { today: today ?? (async (id) => (seen.push(id), { problem: { slug: "a" } })) };
  const app = express();
  app.use("/api/daily", createDailyRouter(daily, [(req, res, next) => ((req.user = user), next())]));
  app.use(handleErrors);
  const server = await new Promise((resolve) => { const s = app.listen(0, () => resolve(s)); });
  return { url: `http://127.0.0.1:${server.address().port}/api/daily`, seen, close: () => server.close() };
}

test("GET answers with today's challenge for the signed-in player", async () => {
  const { url, seen, close } = await serve();
  try {
    const res = await fetch(url);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { problem: { slug: "a" } });
    assert.deepEqual(seen, [1]);
  } finally { close(); }
});

test("someone without a username is turned away", async () => {
  const { url, close } = await serve({ user: { id: 2, username: null } });
  try {
    assert.equal((await fetch(url)).status, 403);
  } finally { close(); }
});

test("a DailyError keeps its status and message", async () => {
  const { url, close } = await serve({ today: async () => { throw new DailyError(503, "Not available."); } });
  try {
    const res = await fetch(url);
    assert.equal(res.status, 503);
    assert.deepEqual(await res.json(), { message: "Not available." });
  } finally { close(); }
});
