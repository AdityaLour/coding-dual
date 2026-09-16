import { problems } from "../problem/problem.js";

export async function handleSubmission(ws, source_code, language_id) {
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
    ws.send(
      JSON.stringify({
        type: "result",
        message: "Congratulation, Correct Answer",
        correct: result,
      }),
    );
  } else {
    result = false;
    ws.send(
      JSON.stringify({
        type: "result",
        correct: result,
        message: "Wrong Answer",
      }),
    );
  }
}

{
  duelId: crypto.randomUUID();
}
