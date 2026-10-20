import express from "express";
import cookieParser from "cookie-parser";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireSameOrigin } from "../middleware/requireSameOrigin.js";
import { practiceLimit } from "../middleware/rateLimits.js";
import { PracticeError } from "../practice/practice.js";

// Turns a PracticeError into its HTTP status; anything else goes to the generic error handler.
const handle = (work) => async (req, res, next) => {
  try {
    await work(req, res);
  } catch (error) {
    if (error instanceof PracticeError) return res.status(error.status).json({ message: error.message });
    next(error);
  }
};

// A signed-in player with a username, like every other game feature.
function requirePlayer(req, res, next) {
  if (!req.user.username) return res.status(403).json({ message: "Pick a username first." });
  next();
}

// `guards` is the sign-in check; tests pass a stand-in for it.
export function createPracticeRouter(practice, guards = [requireSameOrigin, requireAuth]) {
  const router = express.Router();
  // Sources can be 20 KB, above the 10 KB limit the rest of the API uses, so this router
  // is mounted before that parser and reads its own body.
  router.use(express.json({ limit: "32kb" }), cookieParser(), ...guards, requirePlayer, practiceLimit);

  router.get("/problems", handle(async (req, res) => res.json(await practice.list(req.user.id))));
  router.get("/problems/:slug", handle(async (req, res) => res.json(practice.open(req.user.id, req.params.slug))));
  router.get("/problems/:slug/submissions", handle(async (req, res) => res.json(await practice.history(req.user.id, req.params.slug))));
  router.post("/problems/:slug/submit", handle(async (req, res) => {
    const { languageId, source } = req.body ?? {};
    res.status(202).json(await practice.submit(req.user.id, req.params.slug, { languageId, source }));
  }));
  router.post("/problems/:slug/run", handle(async (req, res) => {
    const { languageId, source } = req.body ?? {};
    res.status(202).json(practice.run(req.user.id, req.params.slug, { languageId, source }));
  }));
  router.get("/submissions/:id", handle(async (req, res) => res.json(await practice.getSubmission(req.user.id, req.params.id))));
  router.get("/runs/:id", handle(async (req, res) => res.json(practice.getRun(req.user.id, req.params.id))));
  return router;
}
