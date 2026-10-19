// Problem authoring tool. Run from backend/:
//   node scripts/problems.js list   [topic|slug]   count problems per topic and difficulty
//   node scripts/problems.js build  [topic|slug]   run private/gen.py + solution.py -> private/tests.json
//   node scripts/problems.js seed   [topic|slug]   upsert problems and tests into MySQL
//   node scripts/problems.js verify [topic|slug]   judge every reference + mutant through Judge0 (the real judge code)
// A problem is a folder backend/problems/<topic>/<slug>/ (older ones sit directly in backend/problems/<slug>/):
//   problem.json            public: title, topic, difficulty, rating, statement, samples, limits
//   private/gen.py          prints a JSON list of hidden test inputs     (gitignored: the repo is public)
//   private/solution.py     reference; its output becomes the expected answers
//   private/solution.cpp    second reference (checks the C++ path)
//   private/mutants/*       wa_* / tle_* / re_* : wrong programs that must NOT be accepted
// Rules checked here: at most 30 tests, each input at most 200 KB (Judge0 on this host slows sharply
// above ~400 KB), samples agree with solution.py, difficulty label matches the rating band.
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
const MAX_INPUT_BYTES = 200_000;
const BANDS = { Easy: [0, 1199], Medium: [1200, 1599], Hard: [1600, 4000] };

const difficultyOf = (rating) => Object.keys(BANDS).find((d) => rating >= BANDS[d][0] && rating <= BANDS[d][1]);
const readText = (dir, file) => fs.readFileSync(path.join(dir, file), "utf8");
const readMeta = (dir) => JSON.parse(readText(dir, "problem.json"));
const topicOf = (dir, meta) =>
  meta.topic ?? (path.resolve(path.dirname(dir)) === path.resolve(ROOT) ? "general" : path.basename(path.dirname(dir)));

// Every folder holding a problem.json, one level deep (topic folders) or directly under problems/.
function problems() {
  const found = [];
  const walk = (dir, depth) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const sub = path.join(dir, entry.name);
      if (fs.existsSync(path.join(sub, "problem.json"))) found.push({ slug: entry.name, dir: sub });
      else if (depth < 1) walk(sub, depth + 1);
    }
  };
  walk(ROOT, 0);
  const slugsSeen = new Set();
  for (const p of found) {
    if (slugsSeen.has(p.slug)) throw new Error(`duplicate slug: ${p.slug}`);
    slugsSeen.add(p.slug);
  }
  return found
    .map((p) => ({ ...p, meta: readMeta(p.dir) }))
    .filter((p) => !only || p.slug === only || topicOf(p.dir, p.meta) === only);
}

function checkMeta(slug, meta) {
  if (meta.difficulty !== undefined) {
    const band = BANDS[meta.difficulty];
    if (!band) throw new Error(`${slug}: difficulty must be Easy, Medium or Hard`);
    if (meta.rating < band[0] || meta.rating > band[1]) {
      throw new Error(`${slug}: rating ${meta.rating} is outside ${meta.difficulty} (${band[0]}-${band[1]})`);
    }
  }
}

function python(script, input) {
  const run = spawnSync("python3", ["-I", script], { input, encoding: "utf8", maxBuffer: 1 << 29, timeout: 120_000 });
  if (run.status !== 0) throw new Error(`${path.basename(script)} failed: ${run.stderr || run.error}`);
  return run.stdout;
}

function list() {
  const rows = problems().map(({ slug, dir, meta }) => ({
    topic: topicOf(dir, meta),
    slug,
    difficulty: meta.difficulty ?? difficultyOf(meta.rating),
  }));
  for (const topic of [...new Set(rows.map((r) => r.topic))].sort()) {
    const mine = rows.filter((r) => r.topic === topic);
    const count = (d) => mine.filter((r) => r.difficulty === d).length;
    console.log(
      `${topic.padEnd(24)} ${String(mine.length).padStart(3)} problems   Easy ${count("Easy")}   Medium ${count("Medium")}   Hard ${count("Hard")}`,
    );
  }
  console.log(`\n${rows.length} problems in total`);
}

async function build() {
  const { normalise } = await import("../websocket/judge.js");
  for (const { slug, dir, meta } of problems()) {
    checkMeta(slug, meta);
    const solution = path.join(dir, "private/solution.py");
    const inputs = JSON.parse(python(path.join(dir, "private/gen.py")));
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
    if (tests.some((t) => Buffer.byteLength(t.input) > MAX_INPUT_BYTES)) {
      throw new Error(`${slug}: a test input is over ${MAX_INPUT_BYTES / 1000} KB`);
    }
    fs.writeFileSync(path.join(dir, "private/tests.json"), JSON.stringify(tests));
    const kb = tests.reduce((n, t) => n + Buffer.byteLength(t.input), 0) / 1000;
    console.log(`${slug}: ${tests.length} tests (${meta.samples.length} samples), ${kb.toFixed(0)} KB`);
  }
}

async function seed() {
  const { default: pool } = await import("../db/connection.js");
  const { withTransaction } = await import("../db/transaction.js");
  for (const { slug, dir, meta } of problems()) {
    checkMeta(slug, meta);
    const tests = JSON.parse(readText(dir, "private/tests.json"));
    const tags = [...new Set([topicOf(dir, meta), ...meta.tags])].join(",");
    await withTransaction(async (conn) => {
      await conn.execute(
        `INSERT INTO problems (slug, title, statement, rating, time_limit_ms, memory_limit_kb, duel_minutes, tags, active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
         ON DUPLICATE KEY UPDATE title = VALUES(title), statement = VALUES(statement), rating = VALUES(rating),
           time_limit_ms = VALUES(time_limit_ms), memory_limit_kb = VALUES(memory_limit_kb),
           duel_minutes = VALUES(duel_minutes), tags = VALUES(tags), active = 1`,
        [slug, meta.title, meta.statement, meta.rating, meta.timeLimitMs, meta.memoryKb, meta.minutes, tags],
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
  for (const { slug, dir } of problems()) {
    const [[row]] = await pool.execute("SELECT id FROM problems WHERE slug = ?", [slug]);
    const problem = row && getProblem(row.id);
    if (!problem) {
      console.log(`${slug}: not seeded`);
      bad++;
      continue;
    }
    const priv = path.join(dir, "private");
    const programs = [
      ...["solution.py", "solution.cpp"].map((f) => ({ file: f, expect: "Accepted" })),
      ...(fs.existsSync(path.join(priv, "mutants")) ? fs.readdirSync(path.join(priv, "mutants")) : []).map((f) => ({
        file: `mutants/${f}`,
        expect: MUTANT_VERDICTS[f.split("_")[0]],
      })),
    ];
    for (const { file, expect } of programs) {
      const source = fs.readFileSync(path.join(priv, file), "utf8");
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

const commands = { list, build, seed, verify };
if (!commands[command]) {
  console.error("usage: node scripts/problems.js list|build|seed|verify [topic|slug]");
  process.exit(1);
}
await commands[command]();
