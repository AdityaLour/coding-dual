import express from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { profileLimit } from "../middleware/rateLimits.js";
import { ProfileError } from "../profile/profile.js";

const handle = (work) => async (req, res, next) => {
  try {
    await work(req, res);
  } catch (error) {
    if (error instanceof ProfileError) return res.status(error.status).json({ message: error.message });
    next(error);
  }
};

// Your own profile only, read from the session and never from an id in the URL.
function requirePlayer(req, res, next) {
  if (!req.user.username) return res.status(403).json({ message: "Pick a username first." });
  next();
}

// `guards` is the sign-in check; tests pass a stand-in for it.
export function createProfileRouter(profile, guards = [requireAuth]) {
  const router = express.Router();
  router.use(...guards, requirePlayer, profileLimit);

  router.get("/", handle(async (req, res) => res.json(await profile.summary(req.user.id))));
  router.get("/rating", handle(async (req, res) => res.json(await profile.ratingSeries(req.user.id))));
  router.get("/duels", handle(async (req, res) => {
    const { filter, cursor, limit } = req.query;
    res.json(
      await profile.duels(req.user.id, {
        filter: typeof filter === "string" ? filter : undefined,
        cursor: typeof cursor === "string" ? cursor : undefined,
        limit: limit === undefined ? undefined : Number(limit),
      }),
    );
  }));
  router.get("/account", handle(async (req, res) => res.json(await profile.account(req.user.id))));
  return router;
}
