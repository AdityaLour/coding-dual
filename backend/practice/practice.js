import crypto from "node:crypto";
import { asPractice } from "../websocket/judgeQueue.js";

// Judge0 CE ids: C, C++, Java, JavaScript, Python 3 (same set as duels).
const LANGUAGE_IDS = new Set([50, 54, 62, 63, 71]);

export const LIMITS = {
  gapMs: 5_000, // between two submissions or runs by one user
  dailyCap: 200, // submissions (and, separately, runs) per user per 24 h
  maxJudging: 12, // submissions being judged at once, all users together; more get "busy"
  runKeepMs: 10 * 60 * 1000, // how long a Run result stays readable
  maxSourceBytes: 20 * 1024,
};

// An error with the HTTP status and the words a person sees.
export class PracticeError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const verdictOnly = (verdict) => ({ verdict, failedTest: null, runtimeMs: null });

// Practice mode: solo judging that never touches ratings or duels.
// Everything it needs from outside is passed in, so it can be tested without MySQL or Judge0:
//   repo  - storage of practice submissions
//   judge - { runTests(problem, languageId, source), runExamples(problem, languageId, source) }
//   bank  - { getProblemBySlug, catalogue, practiceProblem }
//   inDuel(userId) - true while the user has a live duel
export function createPractice({ repo, judge, bank, inDuel, now = Date.now, limits = LIMITS }) {
  const judging = new Set(); // users with a submission or run out at the judge
  const lastAt = new Map(); // userId -> time of their last accepted request
  const runs = new Map(); // run id -> { userId, status, ... }; Run results are never stored
  const runsToday = new Map(); // userId -> { day, count }

  const problemOf = (slug) => {
    const problem = bank.getProblemBySlug(slug);
    if (!problem) throw new PracticeError(404, "No such problem.");
    return problem;
  };

  function checkRequest(userId, languageId, source) {
    if (
      typeof source !== "string" ||
      source === "" ||
      Buffer.byteLength(source) > limits.maxSourceBytes ||
      !LANGUAGE_IDS.has(languageId)
    ) {
      throw new PracticeError(400, "Invalid submission.");
    }
    if (inDuel(userId))
      throw new PracticeError(409, "Finish your duel first. Practice opens when it ends.");
    if (judging.has(userId))
      throw new PracticeError(409, "Your last submission is still being judged.");
    if (now() - (lastAt.get(userId) ?? 0) < limits.gapMs)
      throw new PracticeError(429, "Wait a few seconds between submissions.");
    if (judging.size >= limits.maxJudging)
      throw new PracticeError(503, "The judge is busy right now. Try again in a moment.");
  }

  const start = (userId) => {
    judging.add(userId);
    lastAt.set(userId, now());
  };

  async function submit(userId, slug, { languageId, source }) {
    const problem = problemOf(slug);
    checkRequest(userId, languageId, source);
    if ((await repo.countLastDay(userId)) >= limits.dailyCap)
      throw new PracticeError(429, "Daily submission limit reached. Come back tomorrow.");
    if (judging.has(userId)) // a second request got in while the count was being read
      throw new PracticeError(409, "Your last submission is still being judged.");
    start(userId);
    let id;
    try {
      id = await repo.insert(userId, problem.id, languageId, source);
    } catch (error) {
      judging.delete(userId);
      throw error;
    }
    void judgeSubmission(userId, id, problem, languageId, source);
    return { id };
  }

  async function judgeSubmission(userId, id, problem, languageId, source) {
    let outcome;
    try {
      outcome = await asPractice(() => judge.runTests(problem, languageId, source));
    } catch (error) {
      console.error("Practice judging failed:", error);
      outcome = verdictOnly("Judge Error");
    }
    try {
      await repo.finish(id, outcome);
    } catch (error) {
      console.error("Saving practice result failed:", error);
    } finally {
      judging.delete(userId);
    }
  }

  function countRun(userId) {
    const day = Math.floor(now() / 86_400_000);
    const entry = runsToday.get(userId);
    if (!entry || entry.day !== day) runsToday.set(userId, { day, count: 0 });
    const current = runsToday.get(userId);
    if (current.count >= limits.dailyCap)
      throw new PracticeError(429, "Daily run limit reached. Come back tomorrow.");
    current.count++;
  }

  // Run = the examples only. Fast feedback; nothing is saved and it never counts as an attempt.
  function run(userId, slug, { languageId, source }) {
    const problem = problemOf(slug);
    checkRequest(userId, languageId, source);
    countRun(userId);
    start(userId);
    const id = crypto.randomUUID();
    runs.set(id, { userId, status: "judging" });
    setTimeout(() => runs.delete(id), limits.runKeepMs).unref?.();
    void (async () => {
      try {
        const result = await asPractice(() => judge.runExamples(problem, languageId, source));
        runs.set(id, { userId, status: "done", ...result });
      } catch (error) {
        console.error("Practice run failed:", error);
        runs.set(id, { userId, status: "done", verdict: "Judge Error", results: [] });
      } finally {
        judging.delete(userId);
      }
    })();
    return { id };
  }

  const getRun = (userId, id) => {
    const found = runs.get(id);
    if (!found || found.userId !== userId) throw new PracticeError(404, "No such run.");
    const { userId: _owner, ...rest } = found;
    return rest;
  };

  async function getSubmission(userId, id) {
    const row = Number.isSafeInteger(Number(id)) ? await repo.get(Number(id), userId) : null;
    if (!row) throw new PracticeError(404, "No such submission.");
    return shape(row, true);
  }

  const shape = (row, withSource) => ({
    id: Number(row.id),
    languageId: row.language_id,
    verdict: row.verdict,
    done: row.verdict !== "Judging",
    failedTest: row.failed_test,
    runtimeMs: row.runtime_ms,
    createdAt: row.created_at,
    ...(withSource ? { source: row.source } : {}),
  });

  async function history(userId, slug) {
    const problem = problemOf(slug);
    const rows = await repo.history(userId, problem.id, 20);
    return rows.map((row) => shape(row, false));
  }

  // Every problem with what this user has done on it.
  async function list(userId) {
    const progress = new Map((await repo.progress(userId)).map((row) => [row.slug, row]));
    return bank.catalogue().map((entry) => {
      const mine = progress.get(entry.slug);
      return {
        ...entry,
        solved: Boolean(mine?.solved),
        solvedAt: mine?.solved ? mine.solved_at : null,
        attempts: mine ? Number(mine.attempts) : 0,
      };
    });
  }

  function open(userId, slug) {
    const problem = problemOf(slug);
    if (inDuel(userId))
      throw new PracticeError(409, "Finish your duel first. Practice opens when it ends.");
    return bank.practiceProblem(problem);
  }

  return { list, open, submit, run, getSubmission, getRun, history };
}
