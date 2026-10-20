// The plain rules behind the Practice screens. No React in here, so they can be tested directly.
// A list entry is what the server sends: { slug, title, topic, rating, difficulty, solved, attempts }.

export const DIFFICULTIES = ["Easy", "Medium", "Hard"];

export const EMPTY_FILTERS = {
  difficulty: "All",
  topic: "all",
  hideSolved: false,
};

// Solved and total, overall and for each difficulty.
export function progressOf(list) {
  const by = Object.fromEntries(
    DIFFICULTIES.map((name) => [name, { solved: 0, total: 0 }]),
  );
  let solved = 0;
  for (const problem of list) {
    const bucket = by[problem.difficulty];
    if (bucket) bucket.total++;
    if (problem.solved) {
      solved++;
      if (bucket) bucket.solved++;
    }
  }
  return { solved, total: list.length, by };
}

// The same numbers as they stood when the person last looked, given the slugs they had solved then.
export const progressBefore = (list, seenSlugs) =>
  progressOf(
    list.map((problem) => ({ ...problem, solved: seenSlugs.has(problem.slug) })),
  );

// topic -> { solved, total }
export function topicProgress(list) {
  const topics = {};
  for (const problem of list) {
    const entry = (topics[problem.topic] ??= { solved: 0, total: 0 });
    entry.total++;
    if (problem.solved) entry.solved++;
  }
  return topics;
}

export const filterProblems = (list, filters) =>
  list.filter(
    (problem) =>
      (filters.difficulty === "All" ||
        problem.difficulty === filters.difficulty) &&
      (filters.topic === "all" || problem.topic === filters.topic) &&
      !(filters.hideSolved && problem.solved),
  );

// The next problem not yet solved after this one in list order, wrapping round. null when there is none.
export function nextUnsolved(list, slug) {
  const at = list.findIndex((problem) => problem.slug === slug);
  for (let step = 1; step < list.length; step++) {
    const problem = list[(at + step) % list.length];
    if (!problem.solved && problem.slug !== slug) return problem.slug;
  }
  return null;
}

const UNIT = [
  [60, "min"],
  [24, "h"],
  [30, "d"],
];

// "just now", "3 min ago", "2 h ago", "5 d ago", then the date.
export function timeAgo(when, now = Date.now()) {
  const seconds = Math.max(0, Math.round((now - new Date(when).getTime()) / 1000));
  if (Number.isNaN(seconds)) return "";
  if (seconds < 45) return "just now";
  let value = Math.round(seconds / 60);
  for (const [size, name] of UNIT) {
    if (value < size) return `${Math.max(1, value)} ${name} ago`;
    value = Math.round(value / size);
  }
  return new Date(when).toLocaleDateString();
}

// What a verdict says on screen. `good` only for Accepted; a Judge Error is the judge's fault, not the player's.
export function verdictLine({ verdict, failedTest }) {
  if (verdict === "Accepted")
    return { name: "Accepted", detail: "all tests passed", good: true };
  if (verdict === "Judge Error")
    return {
      name: "Judge error",
      detail: "The judge had a problem, not your code. Submit again.",
      good: false,
    };
  return {
    name: verdict,
    detail: failedTest ? `failed on test ${failedTest}` : "",
    good: false,
  };
}

// Run: how many examples passed, and whether the whole run is good.
export function runSummary(result) {
  const results = result.results ?? [];
  const passed = results.filter((example) => example.verdict === "Accepted").length;
  if (result.verdict === "Accepted")
    return { name: "Examples passed", detail: `${passed} of ${results.length}`, good: true };
  if (result.verdict === "Judge Error")
    return verdictLine({ verdict: "Judge Error" });
  if (results.length === 0) return { name: result.verdict, detail: "", good: false };
  return { name: result.verdict, detail: `${passed} of ${results.length} examples passed`, good: false };
}

// The problems the person has solved, latest first. Entries without a time (older data) go last, easiest first.
export function solvedProblems(list) {
  const stamp = (problem) => (problem.solvedAt ? new Date(problem.solvedAt).getTime() : 0);
  return list
    .filter((problem) => problem.solved)
    .sort((a, b) => stamp(b) - stamp(a) || a.rating - b.rating);
}
