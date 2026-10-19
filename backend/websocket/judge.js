import { JUDGE_CONCURRENCY, JUDGE_SLOTS } from "./limits.js";

const JUDGE0_URL = process.env.JUDGE0_URL ?? "http://localhost:12358";
const REQUEST_TIMEOUT_MS = 20_000;
const COMPILE_TIMEOUT_MS = 30_000;
const RAN_OK = 3; // Judge0 status id: ran to completion; we compare the output ourselves
const BASH = 46; // Judge0 language id used to build and to run C/C++ binaries
const GCC = "/usr/local/gcc-9.2.0"; // where the Judge0 image keeps its compilers
const RPATH = `-Wl,-rpath,${GCC}/lib64`; // so the binary finds its libstdc++ whatever the environment

// C and C++ are compiled once per submission, not once per test (a compile is ~1-6 s).
const COMPILERS = {
  50: {
    file: "main.c",
    build: `${GCC}/bin/gcc -std=c11 -O2 ${RPATH} main.c -o a.out -lm`,
  },
  54: {
    file: "main.cpp",
    build: `${GCC}/bin/g++ -std=c++17 -O2 ${RPATH} main.cpp -o a.out`,
  },
};

const encode = (text) => Buffer.from(text).toString("base64");
const decode = (text) => Buffer.from(text ?? "", "base64").toString();

// Trailing spaces and the final newline never decide a verdict.
export const normalise = (text) =>
  String(text ?? "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trimEnd();

// Judge0 status id -> the verdict a player sees. Nothing else from Judge0 is passed on.
function verdictOf(statusId) {
  if (statusId === 5) return "Time Limit Exceeded";
  if (statusId === 6) return "Compilation Error";
  if (statusId >= 7 && statusId <= 12) return "Runtime Error";
  return "Judge Error";
}

// At most JUDGE_SLOTS Judge0 calls at once, however many duels are running: the rest wait their turn
// here instead of piling up inside Judge0 (where a long queue turns into timeouts and Judge Errors).
let free = JUDGE_SLOTS;
const waiting = [];
const acquire = () =>
  free > 0
    ? (free--, Promise.resolve())
    : new Promise((resolve) => waiting.push(resolve));
const release = () => (waiting.length > 0 ? waiting.shift()() : free++);

const headers = () => ({
  "Content-Type": "application/json",
  "X-Auth-Token": process.env.JUDGE0_AUTH_TOKEN,
});

// One Judge0 run. Everything travels base64, so any output bytes are safe. The stored copy is deleted
// afterwards (needs ENABLE_SUBMISSION_DELETE=true in judge0.conf; if it is off the delete just fails).
async function submit(body, timeoutMs = REQUEST_TIMEOUT_MS) {
  await acquire(); // the request timeout below starts only once a slot is ours
  let result;
  try {
    const response = await fetch(
      `${JUDGE0_URL}/submissions?base64_encoded=true&wait=true&fields=token,status,stdout,time`,
      {
        method: "POST",
        headers: headers(),
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      },
    );
    if (!response.ok) throw new Error(`Judge0 answered ${response.status}`);
    result = await response.json();
  } finally {
    release();
  }
  fetch(`${JUDGE0_URL}/submissions/${result.token}`, {
    method: "DELETE",
    headers: headers(),
  }).catch(() => {});
  return result;
}

// Builds the player's code inside the sandbox and returns the binary as base64.
// null = it would not build (or the build blew a limit): the player's Compilation Error.
async function compile(languageId, source) {
  const { file, build } = COMPILERS[languageId];
  const script = [
    "export TMPDIR=$PWD",
    `base64 -d > ${file} <<'__SRC__'`,
    encode(source),
    "__SRC__",
    `if ${build} 2>/dev/null; then echo OK; base64 -w0 a.out; else echo CE; fi`,
  ].join("\n");
  const { status, stdout } = await submit(
    {
      language_id: BASH,
      source_code: encode(script),
      cpu_time_limit: 10,
      wall_time_limit: 20,
      memory_limit: 512000,
      max_file_size: 4096,
    },
    COMPILE_TIMEOUT_MS,
  );
  const text = decode(stdout);
  if (status?.id === RAN_OK && text.startsWith("OK\n")) return text.slice(3);
  if (status?.id === RAN_OK || (status?.id >= 5 && status?.id <= 12))
    return null;
  throw new Error(`Judge0 build run ended with status ${status?.id}`);
}

// A Bash program that unpacks the binary and becomes it, so stdin, limits and signals reach it directly.
const runner = (binary) =>
  [
    "base64 -d > a.out <<'__BIN__'",
    binary,
    "__BIN__",
    "chmod +x a.out",
    "exec ./a.out",
  ].join("\n");

async function runOne(problem, test, { languageId, source }) {
  const { status, stdout, time } = await submit({
    language_id: languageId,
    source_code: encode(source),
    stdin: encode(test.input),
    cpu_time_limit: problem.timeLimitMs / 1000,
    memory_limit: problem.memoryLimitKb,
    max_file_size: 4096, // KB of output; the default 1024 kills correct programs that print >1 MB
  });
  const ms = Math.round(Number(time ?? 0) * 1000);
  if (status?.id !== RAN_OK) return { verdict: verdictOf(status?.id), ms };
  const right = normalise(decode(stdout)) === normalise(test.expected);
  return { verdict: right ? "Accepted" : "Wrong Answer", ms };
}

// Runs one submission against every test, a few at a time, and stops starting new tests after the
// first failure. -> { verdict, failedTest (1-based, or null), runtimeMs }.
// "Judge Error" means the judge itself failed (the player is not at fault); nothing else is leaked.
export async function runTests(problem, languageId, source) {
  let target = { languageId, source };
  if (COMPILERS[languageId]) {
    try {
      const binary = await compile(languageId, source);
      if (binary === null)
        return { verdict: "Compilation Error", failedTest: null, runtimeMs: 0 };
      target = { languageId: BASH, source: runner(binary) };
    } catch (error) {
      console.error("Judge0 build failed:", error);
      return { verdict: "Judge Error", failedTest: null, runtimeMs: 0 };
    }
  }

  const failures = [];
  let next = 0;
  let slowest = 0;

  async function worker() {
    while (failures.length === 0 && next < problem.tests.length) {
      const index = next++;
      let outcome;
      try {
        outcome = await runOne(problem, problem.tests[index], target);
      } catch (error) {
        console.error("Judge0 call failed:", error);
        outcome = { verdict: "Judge Error", ms: 0 };
      }
      slowest = Math.max(slowest, outcome.ms);
      if (outcome.verdict !== "Accepted") failures.push({ index, ...outcome });
    }
  }
  const workers = Math.min(JUDGE_CONCURRENCY, problem.tests.length);
  await Promise.all(Array.from({ length: workers }, worker));

  if (failures.length === 0)
    return { verdict: "Accepted", failedTest: null, runtimeMs: slowest };
  const broken = failures.find((failure) => failure.verdict === "Judge Error");
  if (broken)
    return { verdict: "Judge Error", failedTest: null, runtimeMs: slowest };
  const first = failures.reduce((a, b) => (b.index < a.index ? b : a));
  const noBuild = first.verdict === "Compilation Error"; // Java: still built per test
  return {
    verdict: first.verdict,
    failedTest: noBuild ? null : first.index + 1,
    runtimeMs: slowest,
  };
}
