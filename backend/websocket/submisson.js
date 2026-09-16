import { problems } from "../problem/problem.js";
import { duels } from "./duels.js";

export async function handleSubmission(ws, source_code, language_id, clients) {
  if (
    typeof source_code !== "string" ||
    source_code === "" ||
    typeof language_id !== "number" ||
    Number.isNaN(language_id)
  ) {
    ws.send(
      JSON.stringify({ type: "submitError", message: "Invalid Submission" }),
    );
    return;
  }

  let opponentId = null;
  const me = clients.find((c) => c.socket === ws);
  const duel = duels[me.duelId];

  if (duel === undefined) {
    ws.send(JSON.stringify({ type: "duelError", message: "No duel found" }));
    return;
  }

  if (duel.status === "finished") {
    ws.send(JSON.stringify({ type: "duelFinish", message: "Match Over" }));
    return;
  } else if (duel.status === "judging") {
    ws.send(
      JSON.stringify({
        type: "duelJudge",
        message: "opponent's code is being judged, please wait",
      }),
    );
    return;
  } else if (duel.status === "waiting") {
    duel.status = "judging";
  }

  const stdin = problems.addTwoNum.stdin;
  const answer = problems.addTwoNum.answer;

  const problemObj = {
    stdin: stdin,
    language_id: language_id,
    source_code: source_code,
  };

  const response = await fetch("http://localhost:12358/submissions?wait=true", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Auth-Token": process.env.JUDGE0_AUTH_TOKEN,
    },
    body: JSON.stringify(problemObj),
  });
  const data = await response.json();

  let result = null;

  if (data.stdout.trim() === answer) {
    result = true;
    duel.status = "finished";
    duel.winner = me.id;
    if (me.id === duel.playerA) {
      opponentId = duel.playerB;
    } else {
      opponentId = duel.playerA;
    }
    ws.send(
      JSON.stringify({
        type: "result",
        message: "Congratulation, Correct Answer",
        correct: result,
      }),
    );
    const opponentClient = clients.find((c) => c.id === opponentId);
    if (opponentClient) {
      opponentClient.socket.send(
        JSON.stringify({ type: "gameOver", message: "You Lost" }),
      );
    }
  } else {
    result = false;
    duel.status = "waiting";
    ws.send(
      JSON.stringify({
        type: "result",
        correct: result,
        message: "Wrong Answer",
      }),
    );
  }
}
