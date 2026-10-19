// Problem authoring tool. Run from backend/:
//   node scripts/problems.js build  [slug]   run private/gen.py + solution.py -> private/tests.json
//   node scripts/problems.js seed   [slug]   upsert problems and tests into MySQL
//   node scripts/problems.js verify [slug]   judge every reference + mutant through Judge0 (the real judge code)
// A problem is a folder in backend/problems/<slug>/ :
//   problem.json            public: title, statement, samples, limits  (committed)
//   private/gen.py          prints a JSON list of test inputs           (gitignored: the repo is public)
//   private/solution.py     reference; its output becomes the expected answers
//   private/solution.cpp    second reference (checks the C++ path)
//   private/mutants/*       wa_* / tle_* / re_* : wrong programs that must NOT be accepted
import "dotenv/config";
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";

const ROOT = fileURLToPath(new URL("../problems/", import.meta.url));
const [command, only] = process.argv.slice(2);
const LANGUAGES = { ".py": 71, ".cpp": 54 };
const MUTANT_VERDICTS = { wa: "Wrong Answer", tle: "Time Limit Exceeded", re: "Runtime Error" };
const MAX_TESTS = 30;
const MAX_INPUT_BYTES = 8 * 1024 * 1024;

const slugs = () =>
  fs.readdirSync(ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory() && (!only || d.name === only))
    .map((d) => d.name);
const read = (slug, file) => fs.readFileSync(path.join(ROOT, slug, file), "utf8");

function python(script, input) {
  const run = spawnSync("python3", ["-I", script], { input, encoding: "utf8", maxBuffer: 1 << 29, timeout: 120_000 });
  if (run.status !== 0) throw new Error(`${path.basename(script)} failed: ${run.stderr || run.error}`);
  return run.stdout;
}

async function build() {
  const { normalise } = await import("../websocket/judge.js");
  for (const slug of slugs()) {
    const meta = JSON.parse(read(slug, "problem.json"));
    const solution = path.join(ROOT, slug, "private/solution.py");
    const inputs = JSON.parse(python(path.join(ROOT, slug, "private/gen.py")));
    const tests = [];
    for (const s of meta.samples) {
      if (normalise(python(solution, s.input)) !== normalise(s.output)) {
        throw new Error(`${slug}: a sample in problem.json disagrees with solution.py`);
      }
      tests.push({ input: s.input, expected: s.output, sample: true });
    }
    for (const input of inputs) {
      tests.push({ input, expected: python(solution, input), sample: false });
    }
    if (tests.length > MAX_TESTS) throw new Error(`${slug}: ${tests.length} tests (max ${MAX_TESTS})`);
    if (tests.some((t) => Buffer.byteLength(t.input) > MAX_INPUT_BYTES)) throw new Error(`${slug}: a test is too large`);
    fs.writeFileSync(path.join(ROOT, slug, "private/tests.json"), JSON.stringify(tests));
    const mb = tests.reduce((n, t) => n + t.input.length, 0) / 1e6;
    console.log(`${slug}: ${tests.length} tests (${meta.samples.length} samples), ${mb.toFixed(1)} MB`);
  }
}

async function seed() {
  const { default: pool } = await import("../db/connection.js");
  const { withTransaction } = await import("../db/transaction.js");
  for (const slug of slugs()) {
    const meta = JSON.parse(read(slug, "problem.json"));
    const tests = JSON.parse(read(slug, "private/tests.json"));
    await withTransaction(async (conn) => {
      await conn.execute(
        `INSERT INTO problems (slug, title, statement, rating, time_limit_ms, memory_limit_kb, duel_minutes, tags, active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
         ON DUPLICATE KEY UPDATE title = VALUES(title), statement = VALUES(statement), rating = VALUES(rating),
           time_limit_ms = VALUES(time_limit_ms), memory_limit_kb = VALUES(memory_limit_kb),
           duel_minutes = VALUES(duel_minutes), tags = VALUES(tags), active = 1`,
        [slug, meta.title, meta.statement, meta.rating, meta.timeLimitMs, meta.memoryKb, meta.minutes, meta.tags.join(",")],
      );
      const [[{ id }]] = await conn.execute("SELECT id FROM problems WHERE slug = ?", [slug]);
      await conn.execute("DELETE FROM test_cases WHERE problem_id = ?", [id]);
      for (const [i, t] of tests.entries()) {
        await conn.execute(
          "INSERT INTO test_cases (problem_id, position, is_sample, input, expected) VALUES (?, ?, ?, ?, ?)",
          [id, i + 1, t.sample ? 1 : 0, t.input, t.expected],
        );
      }
    });
    console.log(`${slug}: seeded ${tests.length} tests`);
  }
  await pool.end();
}

async function verify() {
  const { default: pool } = await import("../db/connection.js");
  const { loadBank, getProblem } = await import("../problem/bank.js");
  const { runTests } = await import("../websocket/judge.js");
  await loadBank();
  let bad = 0;
  for (const slug of slugs()) {
    const [[row]] = await pool.execute("SELECT id FROM problems WHERE slug = ?", [slug]);
    const problem = row && getProblem(row.id);
    if (!problem) {
      console.log(`${slug}: not seeded`);
      bad++;
      continue;
    }
    const dir = path.join(ROOT, slug, "private");
    const programs = [
      ...["solution.py", "solution.cpp"].map((f) => ({ file: f, expect: "Accepted" })),
      ...(fs.existsSync(path.join(dir, "mutants")) ? fs.readdirSync(path.join(dir, "mutants")) : []).map((f) => ({
        file: `mutants/${f}`,
        expect: MUTANT_VERDICTS[f.split("_")[0]],
      })),
    ];
    for (const { file, expect } of programs) {
      const source = fs.readFileSync(path.join(dir, file), "utf8");
      const started = Date.now();
      const got = await runTests(problem, LANGUAGES[path.extname(file)], source);
      const ok = got.verdict === expect;
      if (!ok) bad++;
      console.log(
        `${ok ? "ok  " : "FAIL"} ${slug}/${file}: expected ${expect}, got ${got.verdict}` +
          `${got.failedTest ? ` on test ${got.failedTest}` : ""} (${Date.now() - started} ms)`,
      );
    }
  }
  await pool.end();
  console.log(bad === 0 ? "\nAll good." : `\n${bad} problem(s) above.`);
  if (bad > 0) process.exitCode = 1;
}

const commands = { build, seed, verify };
if (!commands[command]) {
  console.error("usage: node scripts/problems.js build|seed|verify [slug]");
  process.exit(1);
}
await commands[command]();
