import express from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { leaderboardLimit } from "../middleware/rateLimits.js";

// Both boards in one answer, so switching between them on the page is instant.
// `guards` is the sign-in check; tests pass a stand-in for it.
export function createLeaderboardRouter(leaderboard, guards = [requireAuth]) {
  const router = express.Router();
  router.use(...guards, leaderboardLimit);

  router.get("/", async (req, res, next) => {
    try {
      res.json(await leaderboard.board(req.user.id));
    } catch (error) {
      next(error);
    }
  });
  router.get("/rank", async (req, res, next) => {
    try {
      res.json({ rank: await leaderboard.rankOf(req.user.id) });
    } catch (error) {
      next(error);
    }
  });
  return router;
}
