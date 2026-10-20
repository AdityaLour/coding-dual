import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { createProfileRouter } from "./profileRoutes.js";
import { ProfileError } from "../profile/profile.js";
import { handleErrors } from "../middleware/errorHandler.js";

async function serve(profile, user = { id: 4, username: "ada" }) {
  const app = express();
  app.use("/api/profile", createProfileRouter(profile, [(req, res, next) => ((req.user = user), next())]));
  app.use(handleErrors);
  const server = await new Promise((resolve) => { const s = app.listen(0, () => resolve(s)); });
  return { base: `http://127.0.0.1:${server.address().port}/api/profile`, close: () => server.close() };
}

test("every read is for the signed-in user, never for an id in the URL", async () => {
  const asked = [];
  const stub = (name) => async (id, ...rest) => (asked.push([name, id, ...rest]), { ok: name });
  const { base, close } = await serve({ summary: stub("summary"), ratingSeries: stub("rating"), duels: stub("duels"), account: stub("account") });
  try {
    for (const path of ["/?userId=9", "/rating?userId=9", "/duels?userId=9&filter=W&limit=5", "/account?id=9"]) {
      assert.equal((await fetch(base + path)).status, 200);
    }
    assert.deepEqual(asked.map((a) => a[1]), [4, 4, 4, 4]);
    assert.deepEqual(asked[2][2], { filter: "W", cursor: undefined, limit: 5 });
  } finally { close(); }
});

test("a service error keeps its status and message", async () => {
  const { base, close } = await serve({ duels: async () => { throw new ProfileError(400, "Unknown filter."); } });
  try {
    const res = await fetch(`${base}/duels?filter=zzz`);
    assert.equal(res.status, 400);
    assert.deepEqual(await res.json(), { message: "Unknown filter." });
  } finally { close(); }
});

test("a failing database is a 500 with no details", async () => {
  const { base, close } = await serve({ summary: async () => { throw new Error("db down: secret"); } });
  const log = console.error; console.error = () => {};
  try {
    const res = await fetch(`${base}/`);
    assert.equal(res.status, 500);
    assert.ok(!JSON.stringify(await res.json()).includes("secret"));
  } finally { console.error = log; close(); }
});

test("someone without a username is turned away", async () => {
  const { base, close } = await serve({ summary: async () => ({}) }, { id: 5, username: null });
  try {
    assert.equal((await fetch(`${base}/`)).status, 403);
  } finally { close(); }
});
