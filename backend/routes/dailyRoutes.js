import express from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireSameOrigin } from "../middleware/requireSameOrigin.js";
import { dailyLimit } from "../middleware/rateLimits.js";
import { requirePlayer } from "./practiceRoutes.js";
import { DailyError } from "../daily/daily.js";

// Today's problem and this player's streak. Solving goes through the practice routes.
// `guards` is the sign-in check; tests pass a stand-in for it.
export function createDailyRouter(daily, guards = [requireSameOrigin, requireAuth]) {
  const router = express.Router();
  router.use(...guards, requirePlayer, dailyLimit);

  router.get("/", async (req, res, next) => {
    try {
      res.json(await daily.today(req.user.id));
    } catch (error) {
      if (error instanceof DailyError) return res.status(error.status).json({ message: error.message });
      next(error);
    }
  });
  return router;
}
