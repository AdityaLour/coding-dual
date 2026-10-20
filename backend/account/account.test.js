import test from "node:test";
import assert from "node:assert/strict";
import { AccountError, RESEND_AFTER_SECONDS, createAccount } from "./account.js";
import { hashToken } from "../utils/tokens.js";

const TOKEN = "a".repeat(64); // the session token of the device doing the asking

// A small stand-in for the database that behaves like the real one where the rules depend on it.
function world(overrides = {}) {
  const w = {
    user: { email: "ada@x.dev", verified: true, hash: "h:old-pass-1", google: false },
    taken: new Set(),
    pending: null, // { newEmail, age }
    devices: [],
    calls: [],
    revoked: 0,
    mail: [],
    ...overrides,
  };
  const note = (name, ...args) => w.calls.push([name, ...args]);
  const repo = {
    loginInfo: async () => (w.user ? { ...w.user } : null),
    emailInUse: async (email) => w.taken.has(email),
    setPassword: async (id, args) => (note("setPassword", args), w.conflict ? null : w.revoked),
    startEmailChange: async (id, email) => (note("startEmailChange", email), (w.pending = { newEmail: email, age: 0 }), `tok-${email}`),
    pendingEmailChange: async () => w.pending,
    cancelEmailChange: async () => (note("cancel"), (w.pending = null)),
    confirmEmailChange: async (token, keepHash) => {
      note("confirm", token, keepHash);
      if (w.dup) throw Object.assign(new Error("dup"), { code: "ER_DUP_ENTRY" });
      return w.confirmResult ?? null;
    },
    sessions: async () => w.devices,
    deleteSession: async (id, sid, keepHash) => (note("deleteSession", sid, keepHash), w.deleteResult ?? "signed-out"),
    deleteOtherSessions: async (id, keepHash) => (note("deleteOthers", keepHash), 2),
  };
  const mail = new Proxy({}, { get: (_, name) => (...args) => w.mail.push([name, ...args]) });
  const account = createAccount({ repo, mail, hash: async (s) => `h:${s}`, compare: async (s, h) => h === `h:${s}` });
  return { w, account };
}
const fails = (promise, status, code) =>
  assert.rejects(promise, (e) => e instanceof AccountError && e.status === status && (code === undefined || e.extra.code === code));

// ---------- password ----------

test("changing a password needs the right current one", async () => {
  const { account, w } = world();
  await fails(account.changePassword(1, { current: "wrong-pass-9", next: "new-pass-123" }, TOKEN), 403, "WRONG_PASSWORD");
  await fails(account.changePassword(1, { next: "new-pass-123" }, TOKEN), 400);
  assert.equal(w.calls.length, 0); // nothing was written
});

test("a weak or unchanged new password is refused before anything is touched", async () => {
  const { account, w } = world();
  await fails(account.changePassword(1, { current: "old-pass-1", next: "short" }, TOKEN), 400);
  await fails(account.changePassword(1, { current: "old-pass-1", next: "old-pass-1" }, TOKEN), 400);
  assert.equal(w.calls.length, 0);
});

test("a good change keeps this device, signs the others out, and warns by email", async () => {
  const { account, w } = world({ revoked: 3 });
  const result = await account.changePassword(1, { current: "old-pass-1", next: "new-pass-123" }, TOKEN);
  assert.deepEqual(result, { signedOutOthers: 3 });
  const [, args] = w.calls[0];
  assert.equal(args.hash, "h:new-pass-123");
  assert.equal(args.oldHash, "h:old-pass-1"); // only goes through if the password is still the one checked
  assert.equal(args.keepHash, hashToken(TOKEN)); // this device stays signed in
  assert.deepEqual(w.mail[0], ["sendPasswordChangedNotice", "ada@x.dev", false]);
});

test("a Google-only account can set a first password without giving an old one", async () => {
  const { account, w } = world({ user: { email: "g@x.dev", verified: true, hash: null, google: true } });
  await account.changePassword(1, { next: "first-pass-1" }, TOKEN);
  assert.equal(w.calls[0][1].oldHash, null);
  assert.deepEqual(w.mail[0], ["sendPasswordChangedNotice", "g@x.dev", true]);
});

test("an unverified account cannot add a password", async () => {
  const { account } = world({ user: { email: "g@x.dev", verified: false, hash: null, google: false } });
  await fails(account.changePassword(1, { next: "first-pass-1" }, TOKEN), 403);
});

test("two changes at once: the one that lost is told to try again", async () => {
  const { account } = world({ conflict: true });
  await fails(account.changePassword(1, { current: "old-pass-1", next: "new-pass-123" }, TOKEN), 409);
});

// ---------- email ----------

test("an email change needs the password, a valid new address, and a different one", async () => {
  const { account, w } = world();
  await fails(account.requestEmailChange(1, { email: "new@x.dev", password: "wrong-pass-9" }), 403, "WRONG_PASSWORD");
  await fails(account.requestEmailChange(1, { email: "nope", password: "old-pass-1" }), 400);
  await fails(account.requestEmailChange(1, { email: " ADA@x.dev ", password: "old-pass-1" }), 400);
  await fails(account.requestEmailChange(1, { email: "new@x.dev" }), 400);
  assert.equal(w.mail.length, 0);
  assert.equal(w.pending, null);
});

test("a Google account cannot change its email", async () => {
  const { account } = world({ user: { email: "g@x.dev", verified: true, hash: null, google: true } });
  await fails(account.requestEmailChange(1, { email: "new@x.dev", password: "x" }), 403, "GOOGLE_EMAIL");
});

test("the link goes to the NEW address and a heads-up to the old one; nothing changes yet", async () => {
  const { account, w } = world();
  const result = await account.requestEmailChange(1, { email: " New@X.dev ", password: "old-pass-1" });
  assert.deepEqual(result, { pendingEmail: "new@x.dev" });
  assert.deepEqual(w.mail, [
    ["sendEmailChangeLink", "new@x.dev", "tok-new@x.dev"],
    ["sendEmailChangeNotice", "ada@x.dev", "new@x.dev"],
  ]);
  assert.ok(!w.calls.some(([name]) => name === "confirm"));
});

test("an address that is already taken looks exactly the same, and its owner is told", async () => {
  const { account, w } = world({ taken: new Set(["bob@x.dev"]) });
  const result = await account.requestEmailChange(1, { email: "bob@x.dev", password: "old-pass-1" });
  assert.deepEqual(result, { pendingEmail: "bob@x.dev" });
  assert.deepEqual(w.mail, [["sendEmailTakenNotice", "bob@x.dev"]]); // no link is sent, no token exists
  assert.equal(w.pending, null);
});

test("resend: refused with nothing waiting, and not within a minute", async () => {
  const { account, w } = world();
  await fails(account.resendEmailChange(1), 409, "NO_PENDING");
  w.pending = { newEmail: "new@x.dev", age: 20 };
  await assert.rejects(account.resendEmailChange(1), (e) => e.status === 429 && e.extra.retryAfter === RESEND_AFTER_SECONDS - 20);
  assert.equal(w.mail.length, 0);
});

test("resend after a minute sends a fresh link to the same address, without another warning", async () => {
  const { account, w } = world({ pending: { newEmail: "new@x.dev", age: 61 } });
  await account.resendEmailChange(1);
  assert.deepEqual(w.mail, [["sendEmailChangeLink", "new@x.dev", "tok-new@x.dev"]]);
});

test("cancelling drops the waiting change", async () => {
  const { account, w } = world({ pending: { newEmail: "new@x.dev", age: 5 } });
  await account.cancelEmailChange(1);
  assert.equal(w.pending, null);
});

test("opening the link switches the email and tells the old address", async () => {
  const { account, w } = world({ confirmResult: { oldEmail: "ada@x.dev", newEmail: "new@x.dev" } });
  assert.deepEqual(await account.confirmEmailChange({ token: "t" }, TOKEN), { email: "new@x.dev" });
  assert.equal(w.calls[0][2], hashToken(TOKEN));
  assert.deepEqual(w.mail, [["sendEmailChanged", "ada@x.dev", "new@x.dev"]]);
});

test("a bad, used or expired link is a plain 400, and a taken address is a 409", async () => {
  await fails(world().account.confirmEmailChange({ token: "nope" }, undefined), 400);
  await fails(world({ dup: true }).account.confirmEmailChange({ token: "t" }, undefined), 409);
});

// ---------- devices ----------

test("the device list names each browser, puts this one first, and never shows tokens or raw agents", async () => {
  const { account } = world({
    devices: [
      { id: 9, tokenHash: "other", userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0) Version/18 Mobile Safari/604.1", createdAt: 100, lastSeenAt: 500 },
      { id: 7, tokenHash: hashToken(TOKEN), userAgent: null, createdAt: 50, lastSeenAt: null },
    ],
  });
  const { sessions } = await account.sessions(1, TOKEN);
  assert.deepEqual(sessions.map((s) => [s.id, s.current, s.label, s.kind, s.lastActiveAt]), [
    [7, true, "Unknown device", "computer", 50],
    [9, false, "Safari on iOS", "phone", 500],
  ]);
  assert.ok(!JSON.stringify(sessions).includes("other"));
  assert.ok(!JSON.stringify(sessions).includes("Mozilla"));
});

test("a single device is listed alone, as the current one", async () => {
  const { account } = world({ devices: [{ id: 7, tokenHash: hashToken(TOKEN), userAgent: null, createdAt: 50, lastSeenAt: 60 }] });
  const { sessions } = await account.sessions(1, TOKEN);
  assert.equal(sessions.length, 1);
  assert.equal(sessions[0].current, true);
});

test("signing out: another device works, this one is refused, nonsense ids are refused", async () => {
  const { account, w } = world();
  await account.signOutDevice(1, 9, TOKEN);
  assert.deepEqual(w.calls[0], ["deleteSession", 9, hashToken(TOKEN)]);
  await fails(world({ deleteResult: "current" }).account.signOutDevice(1, 7, TOKEN), 400);
  for (const id of [NaN, 0, -3, 1.5]) await fails(account.signOutDevice(1, id, TOKEN), 400);
  assert.equal((await world({ deleteResult: "gone" }).account.signOutDevice(1, 99, TOKEN)), undefined); // already gone: fine
});

test("sign out all others keeps this device", async () => {
  const { account, w } = world();
  assert.deepEqual(await account.signOutOthers(1, TOKEN), { signedOut: 2 });
  assert.deepEqual(w.calls[0], ["deleteOthers", hashToken(TOKEN)]);
});
