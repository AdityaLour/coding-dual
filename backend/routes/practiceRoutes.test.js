import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { createPracticeRouter } from "./practiceRoutes.js";
import { PracticeError } from "../practice/practice.js";
import { handleErrors } from "../middleware/errorHandler.js";

// The real router with a stand-in for sign-in and a recording stand-in for the service.
async function serve(user = { id: 1, username: "ada" }) {
  const seen = [];
  const practice = {
    list: async (id) => (seen.push(["list", id]), [{ slug: "a" }]),
    open: (id, slug) => {
      if (slug === "duel") throw new PracticeError(409, "Finish your duel first.");
      return { slug };
    },
    history: async () => [],
    submit: async (id, slug, body) => (seen.push(["submit", id, slug, body]), { id: 5 }),
    run: (id, slug, body) => (seen.push(["run", id, slug, body]), { id: "r1" }),
    getSubmission: async () => { throw new PracticeError(404, "No such submission."); },
    getRun: () => ({ status: "judging" }),
  };
  const app = express();
  app.use("/api/practice", createPracticeRouter(practice, [(req, res, next) => ((req.user = user), next())]));
  app.use(express.json({ limit: "10kb" }));
  app.use(handleErrors);
  const server = await new Promise((resolve) => { const s = app.listen(0, () => resolve(s)); });
  const base = `http://127.0.0.1:${server.address().port}/api/practice`;
  return { base, seen, close: () => server.close() };
}

const post = (url, body) =>
  fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

test("submit and run answer 202 with an id and pass the body through", async () => {
  const { base, seen, close } = await serve();
  try {
    const body = { languageId: 71, source: "print(1)" };
    const submit = await post(`${base}/problems/two-sum/submit`, body);
    assert.equal(submit.status, 202);
    assert.deepEqual(await submit.json(), { id: 5 });
    const run = await post(`${base}/problems/two-sum/run`, body);
    assert.equal(run.status, 202);
    assert.deepEqual(seen[0], ["submit", 1, "two-sum", body]);
    assert.deepEqual(seen[1], ["run", 1, "two-sum", body]);
  } finally { close(); }
});

test("a 20 KB source gets through the practice parser (the global one stops at 10 KB)", async () => {
  const { base, close } = await serve();
  try {
    const big = await post(`${base}/problems/two-sum/submit`, { languageId: 71, source: "x".repeat(20 * 1024) });
    assert.equal(big.status, 202);
    const huge = await post(`${base}/problems/two-sum/submit`, { languageId: 71, source: "x".repeat(40 * 1024) });
    assert.equal(huge.status, 413);
  } finally { close(); }
});

test("service errors keep their status and message; a missing body is the service's 400 to give", async () => {
  const { base, close } = await serve();
  try {
    const blocked = await fetch(`${base}/problems/duel`);
    assert.equal(blocked.status, 409);
    assert.deepEqual(await blocked.json(), { message: "Finish your duel first." });
    assert.equal((await fetch(`${base}/submissions/1`)).status, 404);
    const empty = await fetch(`${base}/problems/two-sum/run`, { method: "POST" });
    assert.equal(empty.status, 202); // the stub accepts anything; real validation is tested in practice.test.js
  } finally { close(); }
});

test("a user without a username is turned away", async () => {
  const { base, close } = await serve({ id: 2, username: null });
  try {
    const response = await fetch(`${base}/problems`);
    assert.equal(response.status, 403);
  } finally { close(); }
});
