import pool from "../db/connection.js";
import { getProblem } from "../problem/bank.js";
import { sendTo } from "./clients.js";
import { attemptsLeft, duelOf, endDuel } from "./duels.js";
import { runTests } from "./judge.js";
import { MAX_SOURCE_BYTES } from "./limits.js";

// Judge0 CE ids: C, C++, Java, JavaScript, Python 3.
const LANGUAGE_IDS = new Set([50, 54, 62, 63, 71]);

const matchOver = (userId) =>
  sendTo(userId, { type: "duelFinish", message: "Match Over" });

export async function handleSubmission({ userId }, source_code, language_id) {
  if (
    typeof source_code !== "string" ||
    source_code === "" ||
    Buffer.byteLength(source_code) > MAX_SOURCE_BYTES ||
    !LANGUAGE_IDS.has(language_id)
  ) {
    return sendTo(userId, {
      type: "submitError",
      message: "Invalid Submission",
    });
  }

  const duel = duelOf(userId);
  if (!duel)
    return sendTo(userId, { type: "duelError", message: "No duel found" });
  if (duel.status === "finished" || duel.expired) return matchOver(userId);
  if (duel.judging.has(userId)) {
    return sendTo(userId, {
      type: "duelJudge",
      message: "Your last submission is still being judged",
    });
  }
  if (attemptsLeft(duel, userId) <= 0) {
    return sendTo(userId, {
      type: "submitError",
      message: "No submissions left in this duel",
    });
  }

  // The gate is per player: closed before the first await, so a player has one submission out at a time.
  // The rival may submit meanwhile; whoever's Accepted comes back first wins (endDuel's own gate).
  duel.judging.add(userId);
  duel.attempts.set(userId, (duel.attempts.get(userId) ?? 0) + 1);

  let outcome;
  try {
    outcome = await runTests(
      getProblem(duel.problemId),
      language_id,
      source_code,
    );
  } catch (error) {
    console.error("Judging failed:", error);
    outcome = { verdict: "Judge Error", failedTest: null, runtimeMs: null };
  }
  duel.judging.delete(userId);
  const { verdict, failedTest, runtimeMs } = outcome;

  // The duel may have ended while the code ran (rival solved it, forfeit): nothing more to decide.
  if (duel.status === "finished") return matchOver(userId);

  if (verdict === "Judge Error")
    duel.attempts.set(userId, duel.attempts.get(userId) - 1); // not the player's fault
  else {
    pool
      .execute(
        `INSERT INTO submissions (duel_id, user_id, language_id, source, verdict, failed_test, runtime_ms)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          duel.duelId,
          userId,
          language_id,
          source_code,
          verdict,
          failedTest,
          runtimeMs,
        ],
      )
      .catch((error) => console.error("Saving submission failed:", error));
  }

  const correct = verdict === "Accepted";
  sendTo(userId, {
    type: "result",
    correct,
    verdict,
    failedTest,
    runtimeMs,
    message: correct ? "Congratulations, correct answer" : verdict,
    attemptsLeft: attemptsLeft(duel, userId),
  });

  if (correct) return endDuel(duel, userId, "solved");
  // Time ran out while submissions were being judged: the last one back closes the duel.
  if (duel.expired && duel.judging.size === 0) endDuel(duel, null, "timeout");
}
