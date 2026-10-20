import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import cookieParser from "cookie-parser";
import { createAccountRouter } from "./accountRoutes.js";
import { AccountError } from "../account/account.js";
import { handleErrors } from "../middleware/errorHandler.js";

process.env.APP_ORIGIN = "http://app.test";
const ORIGIN = { Origin: "http://app.test", "Content-Type": "application/json" };

async function serve(account, { user = { id: 4, username: "ada" }, signedIn = true } = {}) {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  const guard = (req, res, next) => (signedIn ? ((req.user = user), next()) : res.status(401).json({ message: "no" }));
  app.use("/api/account", createAccountRouter(account, [guard]));
  app.use(handleErrors);
  const server = await new Promise((resolve) => { const s = app.listen(0, () => resolve(s)); });
  return { base: `http://127.0.0.1:${server.address().port}/api/account`, close: () => server.close() };
}
const send = (base, path, method, body, headers = ORIGIN) =>
  fetch(base + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });

test("every change is for the signed-in user and uses this device's session cookie", async () => {
  const seen = [];
  const rec = (name) => async (id, ...rest) => (seen.push([name, id, ...rest]), { ok: name });
  const { base, close } = await serve({ changePassword: rec("password"), requestEmailChange: rec("email"), signOutOthers: rec("others"), sessions: rec("sessions") });
  try {
    const cookie = { ...ORIGIN, Cookie: `boip_session=${"b".repeat(64)}` };
    assert.equal((await send(base, "/password", "POST", { current: "a", next: "b", userId: 9 }, cookie)).status, 200);
    assert.equal((await send(base, "/email", "POST", { email: "n@x.dev", password: "p", userId: 9 })).status, 202);
    assert.equal((await send(base, "/sessions", "DELETE", undefined, cookie)).status, 200);
    assert.equal((await send(base, "/sessions", "GET", undefined, cookie)).status, 200);
    assert.deepEqual(seen.map((s) => s[1]), [4, 4, 4, 4]);
    assert.equal(seen[0][3], "b".repeat(64)); // the session token that stays signed in
    assert.deepEqual(seen[0][2], { current: "a", next: "b", userId: 9 }); // the body is the service's to judge; the id still came from the session
  } finally { close(); }
});

test("a change from another site is blocked, even when signed in", async () => {
  const { base, close } = await serve({ changePassword: async () => ({}) });
  try {
    const res = await send(base, "/password", "POST", { next: "x" }, { Origin: "http://evil.test", "Content-Type": "application/json" });
    assert.equal(res.status, 403);
    assert.equal((await send(base, "/password", "POST", { next: "x" }, { "Content-Type": "application/json" })).status, 403);
  } finally { close(); }
});

test("everything except the email link needs a session", async () => {
  const stub = async () => ({ ok: true });
  const { base, close } = await serve({ changePassword: stub, requestEmailChange: stub, resendEmailChange: stub, cancelEmailChange: stub, sessions: stub, signOutOthers: stub, signOutDevice: stub, confirmEmailChange: stub }, { signedIn: false });
  try {
    for (const [method, path] of [["POST", "/password"], ["POST", "/email"], ["POST", "/email/resend"], ["DELETE", "/email"], ["GET", "/sessions"], ["DELETE", "/sessions"], ["DELETE", "/sessions/3"]]) {
      assert.equal((await send(base, path, method, method === "POST" ? {} : undefined)).status, 401, `${method} ${path}`);
    }
    assert.equal((await send(base, "/email/confirm", "POST", { token: "t" })).status, 200); // the link works on any device
  } finally { close(); }
});

test("service errors keep their status, message and extras; Retry-After is set", async () => {
  const { base, close } = await serve({
    changePassword: async () => { throw new AccountError(403, "That isn’t your current password.", { code: "WRONG_PASSWORD" }); },
    resendEmailChange: async () => { throw new AccountError(429, "Wait 20 seconds before sending it again.", { retryAfter: 20 }); },
  });
  try {
    const wrong = await send(base, "/password", "POST", {});
    assert.equal(wrong.status, 403);
    assert.deepEqual(await wrong.json(), { message: "That isn’t your current password.", code: "WRONG_PASSWORD" });
    const wait = await send(base, "/email/resend", "POST", {});
    assert.equal(wait.status, 429);
    assert.equal(wait.headers.get("retry-after"), "20");
  } finally { close(); }
});

test("device ids come from the URL as numbers; junk is passed on as NaN for the service to refuse", async () => {
  const ids = [];
  const { base, close } = await serve({ signOutDevice: async (user, id) => { ids.push(id); } });
  try {
    assert.equal((await send(base, "/sessions/12", "DELETE")).status, 204);
    await send(base, "/sessions/abc", "DELETE");
    assert.equal(ids[0], 12);
    assert.ok(Number.isNaN(ids[1]));
  } finally { close(); }
});

test("a failing database is a 500 with no details", async () => {
  const { base, close } = await serve({ sessions: async () => { throw new Error("db down: secret"); } });
  const log = console.error; console.error = () => {};
  try {
    const res = await send(base, "/sessions", "GET", undefined, {});
    assert.equal(res.status, 500);
    assert.ok(!JSON.stringify(await res.json()).includes("secret"));
  } finally { console.error = log; close(); }
});
