import express from "express";
import { AccountError } from "../account/account.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireSameOrigin } from "../middleware/requireSameOrigin.js";
import {
  accountLimit,
  emailChangeLimit,
  emailResendLimit,
  linkLimit,
  passwordAttemptLimit,
} from "../middleware/rateLimits.js";
import { readSessionToken } from "../utils/session.js";

const handle = (work) => async (req, res, next) => {
  try {
    await work(req, res);
  } catch (error) {
    if (error instanceof AccountError) {
      if (error.extra.retryAfter) res.set("Retry-After", String(error.extra.retryAfter));
      return res.status(error.status).json({ message: error.message, ...error.extra });
    }
    next(error);
  }
};

// Your own account only: the user comes from the session, never from the request.
// `guards` is the sign-in check; tests pass a stand-in for it.
export function createAccountRouter(account, guards = [requireAuth]) {
  const router = express.Router();
  router.use(requireSameOrigin);

  // The link in the email: works without a session (it may be opened on another device), and signs no one in.
  router.post("/email/confirm", linkLimit, handle(async (req, res) => res.json(await account.confirmEmailChange(req.body, readSessionToken(req)))));

  router.use(...guards, accountLimit);

  router.post("/password", passwordAttemptLimit, handle(async (req, res) => res.json(await account.changePassword(req.user.id, req.body, readSessionToken(req)))));

  router.post("/email", emailChangeLimit, passwordAttemptLimit, handle(async (req, res) => res.status(202).json(await account.requestEmailChange(req.user.id, req.body))));
  router.post("/email/resend", emailResendLimit, handle(async (req, res) => res.status(202).json(await account.resendEmailChange(req.user.id))));
  router.delete("/email", handle(async (req, res) => {
    await account.cancelEmailChange(req.user.id);
    res.status(204).end();
  }));

  router.get("/sessions", handle(async (req, res) => res.json(await account.sessions(req.user.id, readSessionToken(req)))));
  router.delete("/sessions", handle(async (req, res) => res.json(await account.signOutOthers(req.user.id, readSessionToken(req)))));
  router.delete("/sessions/:id", handle(async (req, res) => {
    await account.signOutDevice(req.user.id, Number(req.params.id), readSessionToken(req));
    res.status(204).end();
  }));

  return router;
}
