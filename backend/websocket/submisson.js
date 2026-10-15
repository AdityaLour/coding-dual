import { problems } from "../problem/problem.js";
import { sendTo } from "./clients.js";
import { duelOf, finishDuel, opponentOf } from "./duels.js";
import { MAX_SOURCE_BYTES } from "./limits.js";

// Judge0 CE ids: C, C++, Java, JavaScript, Python 3.
const LANGUAGE_IDS = new Set([50, 54, 62, 63, 71]);
const JUDGE0_TIMEOUT_MS = 10_000;
const RAN_OK = 3; // Judge0 status id: ran to completion; we compare the output ourselves

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
  if (duel.status === "finished") {
    return sendTo(userId, { type: "duelFinish", message: "Match Over" });
  }
  if (duel.status === "judging") {
    return sendTo(userId, {
      type: "duelJudge",
      message: "opponent's code is being judged, please wait",
    });
  }

  duel.status = "judging"; // the gate: closed before the first await, so only one submission is judged at a time

  const { stdin, answer } = problems.addTwoNum;
  let correct = false;
  let message = "Judge unavailable, try again";
  try {
    const response = await fetch(
      "http://localhost:12358/submissions?wait=true",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Auth-Token": process.env.JUDGE0_AUTH_TOKEN,
        },
        body: JSON.stringify({ stdin, language_id, source_code }),
        signal: AbortSignal.timeout(JUDGE0_TIMEOUT_MS),
      },
    );
    const { status, stdout } = await response.json();
    if (status?.id !== RAN_OK) message = status?.description ?? message;
    else if (stdout?.trim() === answer) correct = true;
    else message = "Wrong Answer";
  } catch (error) {
    console.error("Judge0 call failed:", error);
  }

  // Whatever happened above, the gate ends up open (wrong/failed) or the duel finished (won).
  if (correct) finishDuel(duel, userId);
  else duel.status = "waiting";

  if (!correct) return sendTo(userId, { type: "result", correct, message });
  sendTo(userId, {
    type: "result",
    correct,
    message: "Congratulation, Correct Answer",
  });
  sendTo(opponentOf(duel, userId), { type: "gameOver", message: "You Lost" });
}
