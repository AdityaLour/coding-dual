import bcrypt from "bcrypt";
import { describeDevice } from "../utils/deviceLabel.js";
import { hashToken } from "../utils/tokens.js";
import { checkPassword, normalizeEmail } from "../utils/validate.js";

const BCRYPT_COST = 12;
export const RESEND_AFTER_SECONDS = 60;

export class AccountError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.status = status;
    this.extra = extra; // { code, errors, retryAfter } passed on to the response
  }
}

const WRONG_PASSWORD = () =>
  new AccountError(403, "That isn’t your current password.", { code: "WRONG_PASSWORD", errors: { current: "That isn’t your current password." } });

// The account changes. `repo` is the database, `mail` sends the emails (both injected, so the rules can be
// tested without either). Every method acts on one signed-in user; the id always comes from the session.
export function createAccount({ repo, mail, hash = (text) => bcrypt.hash(text, BCRYPT_COST), compare = bcrypt.compare }) {
  const keep = (token) => hashToken(String(token ?? ""));

  // The password check behind every sensitive change. Always runs the comparison, so a wrong password
  // takes as long as a right one.
  async function proveOwner(info, password) {
    if (!info.hash) throw new AccountError(403, "Set a password first.", { code: "NO_PASSWORD" });
    if (typeof password !== "string" || password.length === 0)
      throw new AccountError(400, "Enter your current password.", { errors: { current: "Enter your current password." } });
    if (!(await compare(password, info.hash))) throw WRONG_PASSWORD();
  }

  async function mustKnow(userId) {
    const info = await repo.loginInfo(userId);
    if (!info) throw new AccountError(404, "We couldn’t find your account.");
    return info;
  }

  // ---------- password ----------

  // Change it with the current one; a Google-only account (no password yet) just sets one.
  async function changePassword(userId, { current, next } = {}, sessionToken) {
    const problem = checkPassword(next);
    if (problem) throw new AccountError(400, problem, { errors: { next: problem } });
    const info = await mustKnow(userId);

    if (info.hash) {
      await proveOwner(info, current);
      if (current === next)
        throw new AccountError(400, "Choose a password that’s different from your current one.", {
          errors: { next: "Choose a password that’s different from your current one." },
        });
    } else if (!info.verified) {
      throw new AccountError(403, "Confirm your email first.");
    }

    const revoked = await repo.setPassword(userId, {
      email: info.email,
      hash: await hash(next),
      oldHash: info.hash,
      keepHash: keep(sessionToken),
    });
    if (revoked === null) throw new AccountError(409, "Your password just changed somewhere else. Try again.");
    mail.sendPasswordChangedNotice(info.email, !info.hash);
    return { signedOutOthers: revoked };
  }

  // ---------- email ----------

  // Step 1: asks for the change. Nothing changes yet: a link goes to the NEW address, a heads-up to the old.
  // An address that already belongs to someone gets the same answer, so this can't be used to find accounts.
  async function requestEmailChange(userId, { email, password } = {}) {
    const info = await mustKnow(userId);
    if (info.google) throw new AccountError(403, "Your email comes from your Google account, so it can’t be changed here.", { code: "GOOGLE_EMAIL" });
    const wanted = normalizeEmail(email);
    if (!wanted) throw new AccountError(400, "Enter a valid email address, like name@example.com.", { errors: { email: "Enter a valid email address, like name@example.com." } });
    await proveOwner(info, password);
    if (wanted === info.email) throw new AccountError(400, "That’s already your email.", { errors: { email: "That’s already your email." } });

    if (await repo.emailInUse(wanted, userId)) {
      mail.sendEmailTakenNotice(wanted);
      return { pendingEmail: wanted };
    }
    const token = await repo.startEmailChange(userId, wanted);
    mail.sendEmailChangeLink(wanted, token);
    mail.sendEmailChangeNotice(info.email, wanted);
    return { pendingEmail: wanted };
  }

  // Sends the link again (to the same address), at most once a minute.
  async function resendEmailChange(userId) {
    const pending = await repo.pendingEmailChange(userId);
    if (!pending) throw new AccountError(409, "There’s no email change waiting. Start a new one.", { code: "NO_PENDING" });
    if (pending.age < RESEND_AFTER_SECONDS) {
      const retryAfter = RESEND_AFTER_SECONDS - pending.age;
      throw new AccountError(429, `Wait ${retryAfter} seconds before sending it again.`, { retryAfter });
    }
    const token = await repo.startEmailChange(userId, pending.newEmail);
    mail.sendEmailChangeLink(pending.newEmail, token);
    return { pendingEmail: pending.newEmail };
  }

  async function cancelEmailChange(userId) {
    await repo.cancelEmailChange(userId);
  }

  // Step 2: the link from the new inbox. Works whether or not anyone is signed in on this browser; it never
  // signs anyone in. Other devices are signed out (this one stays, if it is the same account).
  async function confirmEmailChange({ token } = {}, sessionToken) {
    let done;
    try {
      done = await repo.confirmEmailChange(token, keep(sessionToken));
    } catch (error) {
      if (error.code === "ER_DUP_ENTRY") throw new AccountError(409, "That email now belongs to another account. Start again with a different address.");
      throw error;
    }
    if (!done) throw new AccountError(400, "This link is invalid or has expired.");
    mail.sendEmailChanged(done.oldEmail, done.newEmail);
    return { email: done.newEmail };
  }

  // ---------- devices ----------

  async function sessions(userId, sessionToken) {
    const mine = keep(sessionToken);
    const rows = await repo.sessions(userId);
    const list = rows.map((row) => {
      const { label, kind } = describeDevice(row.userAgent);
      return { id: row.id, label, kind, current: row.tokenHash === mine, lastActiveAt: row.lastSeenAt ?? row.createdAt, signedInAt: row.createdAt };
    });
    list.sort((a, b) => Number(b.current) - Number(a.current)); // this device first; the rest stay newest-first
    return { sessions: list };
  }

  async function signOutDevice(userId, id, sessionToken) {
    if (!Number.isInteger(id) || id <= 0) throw new AccountError(400, "That isn’t a device.");
    const result = await repo.deleteSession(userId, id, keep(sessionToken));
    if (result === "current") throw new AccountError(400, "This is the device you’re using. Use Log out instead.");
  }

  async function signOutOthers(userId, sessionToken) {
    return { signedOut: await repo.deleteOtherSessions(userId, keep(sessionToken)) };
  }

  return { changePassword, requestEmailChange, resendEmailChange, cancelEmailChange, confirmEmailChange, sessions, signOutDevice, signOutOthers };
}
