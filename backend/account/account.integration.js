// Runs the account changes against a REAL MySQL database: the actual SQL, transactions and constraints.
// It empties the users, sessions, logins and email_tokens tables first, so it refuses to run unless
// DB_NAME ends in "_test". Setup (once):
//   mysql -u root -p -e "CREATE DATABASE coding_duel_test"
//   mysql -u dual_app -p coding_duel_test < db/schema.sql      (dual_app needs rights on that database)
// Run:  DB_NAME=coding_duel_test npm run test:db   (DB_HOST, DB_USER, DB_PASSWORD from your .env)
import test from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcrypt";

const SAFE = /_test$/.test(process.env.DB_NAME ?? "");
process.env.APP_ORIGIN ??= "http://app.test";
process.env.SMTP_HOST ??= "127.0.0.1";
process.env.SMTP_PORT ??= "1025";
process.env.MAIL_FROM ??= "boip@example.test";

const skip = SAFE ? false : "set DB_NAME to a database ending in _test (see the top of this file)";
const { default: pool } = await import("../db/connection.js");
const { repo } = await import("./repo.js");
const { createAccount } = await import("./account.js");
const { repo: profileRepo } = await import("../profile/repo.js");
const { createSession, touchSession } = await import("../utils/session.js");
const { login } = await import("../controllers/authController.js");
const { hashToken } = await import("../utils/tokens.js");

const UA = {
  chrome: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  iphone: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
  firefox: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:131.0) Gecko/20100101 Firefox/131.0",
};
const OLD = "old-pass-1";

const outbox = [];
const mail = new Proxy({}, { get: (_, name) => (...args) => outbox.push([name, ...args]) });
const account = createAccount({ repo, mail });
const sent = (name) => outbox.filter(([n]) => n === name);

async function reset() {
  outbox.length = 0;
  await pool.query("SET FOREIGN_KEY_CHECKS = 0");
  for (const table of ["email_tokens", "sessions", "logins", "duels", "problems", "users"]) await pool.query(`DELETE FROM ${table}`);
  await pool.query("SET FOREIGN_KEY_CHECKS = 1");
}
async function addUser(name, { password = OLD, google = false } = {}) {
  const [made] = await pool.execute("INSERT INTO users (email, username, email_verified_at) VALUES (?, ?, NOW())", [`${name}@x.dev`, name]);
  if (password) await pool.execute("INSERT INTO logins (user_id, provider, provider_user_id, password) VALUES (?, 'email', ?, ?)", [made.insertId, `${name}@x.dev`, await bcrypt.hash(password, 4)]);
  if (google) await pool.execute("INSERT INTO logins (user_id, provider, provider_user_id) VALUES (?, 'google', ?)", [made.insertId, `sub-${name}`]);
  return made.insertId;
}
const count = async (sql, params = []) => Number((await pool.execute(sql, params))[0][0].n);
const attempt = async (email, password) => {
  let out;
  await login({ body: { email, password }, cookies: {}, get: () => UA.chrome }, { status: (code) => ({ json: (body) => (out = { code, body }) }), cookie() {} });
  return out.code;
};

// ---------- password ----------

test("password change: wrong current is refused untouched; right one signs the others out and keeps this device", { skip }, async () => {
  await reset();
  const ada = await addUser("ada");
  const here = await createSession(ada, pool, UA.chrome);
  await createSession(ada, pool, UA.iphone);
  await createSession(ada, pool, UA.firefox);
  await pool.execute("INSERT INTO email_tokens (user_id, purpose, token_hash, expires_at) VALUES (?, 'reset', ?, DATE_ADD(NOW(), INTERVAL 1 HOUR))", [ada, "r".repeat(64)]);
  await pool.execute("INSERT INTO email_tokens (user_id, purpose, new_email, token_hash, expires_at) VALUES (?, 'email_change', 'z@x.dev', ?, DATE_ADD(NOW(), INTERVAL 1 HOUR))", [ada, "e".repeat(64)]);

  await assert.rejects(account.changePassword(ada, { current: "nope-nope-1", next: "new-pass-123" }, here), (e) => e.status === 403);
  assert.equal(await count("SELECT COUNT(*) AS n FROM sessions WHERE user_id = ?", [ada]), 3);
  assert.equal(await attempt("ada@x.dev", OLD), 200);

  const done = await account.changePassword(ada, { current: OLD, next: "new-pass-123" }, here);
  assert.deepEqual(done, { signedOutOthers: 3 }); // phone, firefox, and the session the test login above opened
  const left = (await pool.execute("SELECT token_hash FROM sessions WHERE user_id = ? AND token_hash = ?", [ada, hashToken(here)]))[0];
  assert.equal(left.length, 1);
  assert.equal(await count("SELECT COUNT(*) AS n FROM sessions WHERE user_id = ?", [ada]) >= 1, true);
  assert.equal(await count("SELECT COUNT(*) AS n FROM email_tokens WHERE user_id = ?", [ada]), 0); // reset and email-change links died
  assert.equal(await attempt("ada@x.dev", OLD), 401);
  assert.equal(await attempt("ada@x.dev", "new-pass-123"), 200);
  assert.deepEqual(sent("sendPasswordChangedNotice")[0], ["sendPasswordChangedNotice", "ada@x.dev", false]);
});

test("password change: two at once, only one wins", { skip }, async () => {
  await reset();
  const ada = await addUser("ada");
  const here = await createSession(ada, pool, UA.chrome);
  const results = await Promise.allSettled([
    account.changePassword(ada, { current: OLD, next: "first-pass-11" }, here),
    account.changePassword(ada, { current: OLD, next: "second-pass-22" }, here),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(results.find((r) => r.status === "rejected").reason.status, 409);
});

test("a Google-only account sets its first password once, and can then log in with its email", { skip }, async () => {
  await reset();
  const gus = await addUser("gus", { password: null, google: true });
  const here = await createSession(gus, pool, UA.chrome);
  assert.equal((await profileRepo.account(gus)).password, false);
  await account.changePassword(gus, { next: "first-pass-11" }, here);
  assert.equal((await profileRepo.account(gus)).password, true);
  assert.equal(await attempt("gus@x.dev", "first-pass-11"), 200);
  const info = await repo.loginInfo(gus);
  assert.equal(info.google, true); // Google still works too
  await assert.rejects(account.requestEmailChange(gus, { email: "new@x.dev", password: "first-pass-11" }), (e) => e.status === 403 && e.extra.code === "GOOGLE_EMAIL");
});

// ---------- email ----------

test("email change, start to finish", { skip }, async () => {
  await reset();
  const ada = await addUser("ada");
  const here = await createSession(ada, pool, UA.chrome);
  await createSession(ada, pool, UA.iphone);
  await pool.execute("INSERT INTO email_tokens (user_id, purpose, token_hash, expires_at) VALUES (?, 'reset', ?, DATE_ADD(NOW(), INTERVAL 1 HOUR))", [ada, "r".repeat(64)]);

  assert.deepEqual(await account.requestEmailChange(ada, { email: " New@X.dev ", password: OLD }), { pendingEmail: "new@x.dev" });
  const [, to, token] = sent("sendEmailChangeLink")[0];
  assert.equal(to, "new@x.dev");
  assert.match(token, /^[a-f0-9]{64}$/);
  assert.deepEqual(sent("sendEmailChangeNotice")[0], ["sendEmailChangeNotice", "ada@x.dev", "new@x.dev"]);
  // only the hash is stored, never the token
  assert.equal(await count("SELECT COUNT(*) AS n FROM email_tokens WHERE token_hash = ?", [token]), 0);
  assert.equal(await count("SELECT COUNT(*) AS n FROM email_tokens WHERE token_hash = ? AND new_email = 'new@x.dev'", [hashToken(token)]), 1);
  // nothing has changed yet
  assert.equal((await profileRepo.account(ada)).email, "ada@x.dev");
  assert.equal((await profileRepo.account(ada)).pendingEmail, "new@x.dev");
  assert.equal(await attempt("ada@x.dev", OLD), 200);
  assert.equal(await attempt("new@x.dev", OLD), 401);

  // a second link within the minute is refused; after the minute the old link dies and the new one works
  await assert.rejects(account.resendEmailChange(ada), (e) => e.status === 429);
  await pool.execute("UPDATE email_tokens SET created_at = DATE_SUB(NOW(), INTERVAL 2 MINUTE) WHERE user_id = ?", [ada]);
  await account.resendEmailChange(ada);
  const fresh = sent("sendEmailChangeLink")[1][2];
  assert.notEqual(fresh, token);
  await assert.rejects(account.confirmEmailChange({ token }, here), (e) => e.status === 400); // the older link is dead

  assert.deepEqual(await account.confirmEmailChange({ token: fresh }, here), { email: "new@x.dev" });
  const user = (await pool.execute("SELECT email, email_verified_at FROM users WHERE id = ?", [ada]))[0][0];
  assert.equal(user.email, "new@x.dev");
  assert.ok(user.email_verified_at);
  assert.equal(await count("SELECT COUNT(*) AS n FROM logins WHERE user_id = ? AND provider_user_id = 'new@x.dev'", [ada]), 1);
  assert.equal(await count("SELECT COUNT(*) AS n FROM sessions WHERE user_id = ?", [ada]), 1); // only this device remains
  assert.equal(await count("SELECT COUNT(*) AS n FROM sessions WHERE user_id = ? AND token_hash = ?", [ada, hashToken(here)]), 1);
  assert.equal(await count("SELECT COUNT(*) AS n FROM email_tokens WHERE user_id = ? AND used_at IS NULL", [ada]), 0); // the waiting reset link died too
  assert.deepEqual(sent("sendEmailChanged")[0], ["sendEmailChanged", "ada@x.dev", "new@x.dev"]);
  assert.equal(await attempt("new@x.dev", OLD), 200);
  assert.equal(await attempt("ada@x.dev", OLD), 401);
  assert.equal((await profileRepo.account(ada)).pendingEmail, null);
  await assert.rejects(account.confirmEmailChange({ token: fresh }, here), (e) => e.status === 400); // a link works once
});

test("email change: the requester's password is checked, and a taken address looks the same but sends no link", { skip }, async () => {
  await reset();
  const ada = await addUser("ada");
  await addUser("bob");
  await assert.rejects(account.requestEmailChange(ada, { email: "new@x.dev", password: "nope-nope-1" }), (e) => e.status === 403);
  assert.equal(await count("SELECT COUNT(*) AS n FROM email_tokens"), 0);
  assert.deepEqual(await account.requestEmailChange(ada, { email: "bob@x.dev", password: OLD }), { pendingEmail: "bob@x.dev" });
  assert.equal(await count("SELECT COUNT(*) AS n FROM email_tokens"), 0);
  assert.deepEqual(sent("sendEmailTakenNotice")[0], ["sendEmailTakenNotice", "bob@x.dev"]);
  assert.equal(sent("sendEmailChangeLink").length, 0);
});

test("email change: an address taken after the request is refused and nothing changes", { skip }, async () => {
  await reset();
  const ada = await addUser("ada");
  const here = await createSession(ada, pool, UA.chrome);
  await account.requestEmailChange(ada, { email: "late@x.dev", password: OLD });
  const token = sent("sendEmailChangeLink")[0][2];
  await pool.execute("INSERT INTO users (email, username, email_verified_at) VALUES ('late@x.dev', 'late', NOW())");
  await assert.rejects(account.confirmEmailChange({ token }, here), (e) => e.status === 409);
  assert.equal((await pool.execute("SELECT email FROM users WHERE id = ?", [ada]))[0][0].email, "ada@x.dev");
  assert.equal(await count("SELECT COUNT(*) AS n FROM email_tokens WHERE user_id = ? AND used_at IS NULL", [ada]), 1); // rolled back
});

test("email change: an expired link and a cancelled change are dead", { skip }, async () => {
  await reset();
  const ada = await addUser("ada");
  await account.requestEmailChange(ada, { email: "a2@x.dev", password: OLD });
  const token = sent("sendEmailChangeLink")[0][2];
  await pool.execute("UPDATE email_tokens SET expires_at = DATE_SUB(NOW(), INTERVAL 1 MINUTE) WHERE user_id = ?", [ada]);
  await assert.rejects(account.confirmEmailChange({ token }, undefined), (e) => e.status === 400);
  assert.equal((await profileRepo.account(ada)).pendingEmail, null);

  await account.requestEmailChange(ada, { email: "a3@x.dev", password: OLD });
  const second = sent("sendEmailChangeLink")[1][2];
  await account.cancelEmailChange(ada);
  assert.equal((await profileRepo.account(ada)).pendingEmail, null);
  await assert.rejects(account.confirmEmailChange({ token: second }, undefined), (e) => e.status === 400);
});

test("email change: opening one link twice at the same time works exactly once", { skip }, async () => {
  await reset();
  const ada = await addUser("ada");
  await account.requestEmailChange(ada, { email: "once@x.dev", password: OLD });
  const token = sent("sendEmailChangeLink")[0][2];
  const results = await Promise.allSettled([account.confirmEmailChange({ token }, undefined), account.confirmEmailChange({ token }, undefined)]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(sent("sendEmailChanged").length, 1);
});

test("a password-reset link cannot be used as an email-change link, or the other way round", { skip }, async () => {
  await reset();
  const ada = await addUser("ada");
  await pool.execute("INSERT INTO email_tokens (user_id, purpose, token_hash, expires_at) VALUES (?, 'reset', ?, DATE_ADD(NOW(), INTERVAL 1 HOUR))", [ada, hashToken("c".repeat(64))]);
  await assert.rejects(account.confirmEmailChange({ token: "c".repeat(64) }, undefined), (e) => e.status === 400);
  assert.equal(await count("SELECT COUNT(*) AS n FROM email_tokens WHERE used_at IS NULL"), 1); // untouched
});

// ---------- devices ----------

test("devices: this device alone is listed alone; others are named, newest first; ids can't reach other users", { skip }, async () => {
  await reset();
  const ada = await addUser("ada");
  const bob = await addUser("bob");
  const here = await createSession(ada, pool, UA.chrome);
  assert.deepEqual((await account.sessions(ada, here)).sessions.map((s) => [s.label, s.current]), [["Chrome on Linux", true]]);

  const phone = await createSession(ada, pool, UA.iphone);
  await createSession(ada, pool, UA.firefox);
  const bobs = await createSession(bob, pool, UA.chrome);
  await pool.execute("UPDATE sessions SET last_seen_at = DATE_SUB(NOW(), INTERVAL 3 DAY) WHERE token_hash = ?", [hashToken(phone)]);
  const list = (await account.sessions(ada, here)).sessions;
  assert.deepEqual(list.map((s) => [s.label, s.kind, s.current]), [["Chrome on Linux", "computer", true], ["Firefox on Windows", "computer", false], ["Safari on iOS", "phone", false]]);
  assert.ok(!JSON.stringify(list).includes(hashToken(here)));

  const bobsId = (await pool.execute("SELECT id FROM sessions WHERE token_hash = ?", [hashToken(bobs)]))[0][0].id;
  await account.signOutDevice(ada, bobsId, here); // someone else's id: nothing happens, and it looks like "already gone"
  assert.equal(await count("SELECT COUNT(*) AS n FROM sessions WHERE user_id = ?", [bob]), 1);

  const currentId = list.find((s) => s.current).id;
  await assert.rejects(account.signOutDevice(ada, currentId, here), (e) => e.status === 400);
  const phoneId = list.find((s) => s.label === "Safari on iOS").id;
  await account.signOutDevice(ada, phoneId, here);
  assert.equal((await account.sessions(ada, here)).sessions.length, 2);
  await account.signOutDevice(ada, phoneId, here); // twice is fine
  assert.deepEqual(await account.signOutOthers(ada, here), { signedOut: 1 });
  assert.deepEqual((await account.sessions(ada, here)).sessions.map((s) => s.current), [true]);
});

test("devices: expired sessions never show; a session from before the Devices list gets its browser on first use", { skip }, async () => {
  await reset();
  const ada = await addUser("ada");
  const here = await createSession(ada, pool, null); // as if created before the migration: no browser, no last-seen
  await pool.execute("UPDATE sessions SET last_seen_at = NULL WHERE token_hash = ?", [hashToken(here)]);
  const old = await createSession(ada, pool, UA.firefox);
  await pool.execute("UPDATE sessions SET expires_at = DATE_SUB(NOW(), INTERVAL 1 DAY) WHERE token_hash = ?", [hashToken(old)]);
  assert.deepEqual((await account.sessions(ada, here)).sessions.map((s) => s.label), ["Unknown device"]);

  touchSession(here, { get: () => UA.chrome });
  await new Promise((resolve) => setTimeout(resolve, 200));
  const row = (await pool.execute("SELECT user_agent, last_seen_at FROM sessions WHERE token_hash = ?", [hashToken(here)]))[0][0];
  assert.equal(row.user_agent, UA.chrome);
  assert.ok(row.last_seen_at);
  assert.equal((await account.sessions(ada, here)).sessions[0].label, "Chrome on Linux");
});

test.after(async () => {
  await pool.end();
});
