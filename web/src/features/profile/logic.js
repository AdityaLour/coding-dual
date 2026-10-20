// The plain rules behind the profile screens. No React in here, so they can be tested directly.
import { gainText } from "../leaderboard/logic.js";
import { progressOf, solvedProblems, topicProgress } from "../practice/logic.js";
import { compareTopics } from "../practice/topics.js";

export { gainText };

export const TABS = ["overview", "rating", "duels", "practice", "account"];
export const tabOf = (value) => (TABS.includes(value) ? value : "overview");

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const clock = (seconds) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

export function longDate(ms) {
  const d = new Date(ms);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

// "5m ago", "3h ago", "Yesterday", then the date.
export function whenText(ms, now = Date.now()) {
  const minutes = Math.floor((now - ms) / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  if (hours < 48) return "Yesterday";
  return longDate(ms);
}

// W, L, D, or U for a duel that was played but did not count.
export const resultTag = (duel) => (duel.rated ? duel.result : "U");
const WORD = { W: "won", L: "lost", D: "drawn", U: "unrated" };
export const resultWord = (tag) => WORD[tag];

// One line on how a duel ended, from the player's side.
export function storyOf(duel) {
  if (duel.why === "timeout") return "Time ran out and nobody solved it.";
  if (duel.result === "W") return duel.why === "solved" ? "You solved it first." : "Your rival left the duel.";
  if (duel.result === "L") return duel.why === "solved" ? "Your rival solved it first." : "You left the duel.";
  return "The duel ended in a draw.";
}

// The last ten as ten slots, oldest first. Missing ones at the front are empty.
export function stripCells(last10) {
  const cells = last10.map((d, i) => ({
    key: `r${i}`,
    result: d.result,
    label: `${d.opponent}: ${WORD[d.result]}`,
    tip: `${d.opponent} · ${d.result === "U" ? "unrated" : gainText(d.delta)}`,
  }));
  while (cells.length < 10) cells.unshift({ key: `e${cells.length}`, result: null });
  return cells;
}

export const streakText = (streak) => (streak.current > 1 ? `${streak.current} wins in a row` : "");
export const winPercent = ({ wins, rated }) => (rated ? Math.round((wins / rated) * 100) : 0);

// ---------- rating chart ----------

export const RANGES = [10, 30, "all"];
export const PAD = { left: 46, right: 18, top: 22, bottom: 28 };

export const rangeLabel = (range, series) =>
  range !== "all" ? `Last ${range}` : series.truncated ? `Last ${series.points.length}` : "All time";

// The points to draw: the chosen number of duels plus the one before them, so the line has somewhere to start.
// The very first point is the 1200 everyone starts on, when the series reaches back that far.
export function chartPoints(series, range) {
  const start = series.truncated ? [] : [{ n: 0, after: series.start, start: true }];
  const all = [...start, ...series.points];
  return range === "all" ? all : all.slice(-(range + 1));
}

export function niceBounds(values) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const step = max - min > 180 ? 50 : 25;
  const lo = Math.floor((min - 10) / step) * step;
  let hi = Math.ceil((max + 10) / step) * step;
  if (hi === lo) hi += step;
  return { lo, hi, step };
}

// Everything the drawing needs, from the points and the size of the box.
export function chartGeometry(points, width, height) {
  const { lo, hi, step } = niceBounds(points.map((p) => p.after));
  const n = points.length;
  const inner = width - PAD.left - PAD.right;
  const x = (i) => (n === 1 ? PAD.left + inner / 2 : PAD.left + (i * inner) / (n - 1));
  const y = (v) => PAD.top + (1 - (v - lo) / (hi - lo)) * (height - PAD.top - PAD.bottom);
  const ticks = [];
  for (let v = lo; v <= hi; v += step) ticks.push(v);
  let length = 0;
  for (let i = 1; i < n; i++) length += Math.hypot(x(i) - x(i - 1), y(points[i].after) - y(points[i - 1].after));
  return { x, y, lo, hi, ticks, n, width, height, length: Math.ceil(length) };
}

export function nearestIndex(px, geometry) {
  if (geometry.n === 1) return 0;
  const step = (geometry.width - PAD.left - PAD.right) / (geometry.n - 1);
  return Math.max(0, Math.min(geometry.n - 1, Math.round((px - PAD.left) / step)));
}

// The stretch of the chart that is placement (the first duels), or null when it is not in view.
export function placementSpan(points, placementDuels) {
  const first = points.findIndex((p) => p.n === 1);
  const last = points.findIndex((p) => p.n === placementDuels);
  return first > 0 && last >= 0 ? { from: first - 1, to: last } : null;
}

export function pointText(point) {
  if (point.start) return { title: "Starting rating", detail: String(point.after) };
  return {
    title: `Duel ${point.n} · ${longDate(point.t)}`,
    detail: `${point.after} (${gainText(point.delta)}) ${WORD[point.result]} vs ${point.opponent}`,
  };
}

export function ratingFacts(series, summary) {
  const best = [...series.points].sort((a, b) => b.delta - a.delta)[0];
  return { best: best && best.delta > 0 ? best : null, peak: summary.peak, low: summary.low, now: summary.rating };
}

// ---------- practice tab ----------

const WEEK_MS = 7 * 86400000;

export function practiceSummary(list, now = Date.now()) {
  const progress = progressOf(list);
  const topics = topicProgress(list);
  return {
    ...progress,
    topics: Object.keys(topics)
      .sort(compareTopics)
      .map((slug) => ({ slug, ...topics[slug] })),
    recent: solvedProblems(list).slice(0, 6),
    attempted: list.filter((p) => p.attempts > 0).length,
    submissions: list.reduce((sum, p) => sum + p.attempts, 0),
    thisWeek: list.filter((p) => p.solved && p.solvedAt && now - new Date(p.solvedAt).getTime() < WEEK_MS).length,
  };
}

// ---------- account tab ----------

export const MIN_PASSWORD = 8;

export function passwordChecks({ current = "", next = "", confirm = "" }, needsCurrent = true) {
  return {
    len: next.length >= MIN_PASSWORD,
    mix: /[a-z]/i.test(next) && /\d/.test(next),
    diff: needsCurrent ? next.length > 0 && next !== current : true,
    match: next.length > 0 && next === confirm,
  };
}

// 0 to 4, shown as four slanted pips. Anything under 8 characters is 1 (weak).
export function passwordStrength(next) {
  if (!next) return 0;
  if (next.length < MIN_PASSWORD) return 1;
  let score = 0;
  if (next.length >= 8) score++;
  if (next.length >= 12) score++;
  if (/[a-z]/i.test(next) && /\d/.test(next)) score++;
  if (/[A-Z]/.test(next) && /[a-z]/.test(next) && /[^A-Za-z0-9]/.test(next)) score++;
  return Math.max(score, 1);
}
export const STRENGTH_LABELS = ["", "Weak", "Okay", "Good", "Strong"];

// The first thing wrong with a password change, as { field, message }, or null when it can go ahead.
export function passwordProblem(values, needsCurrent = true) {
  const checks = passwordChecks(values, needsCurrent);
  if (needsCurrent && !values.current) return { field: "current", message: "Enter your current password." };
  if (!checks.len || !checks.mix)
    return { field: "next", message: "Use at least 8 characters with a letter and a number." };
  if (!checks.diff) return { field: "next", message: "Choose a password that’s different from your current one." };
  if (!checks.match) return { field: "confirm", message: "The two new passwords don’t match." };
  return null;
}

export function emailProblem(value, currentEmail) {
  const email = value.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email)) return "Enter a valid email address, like name@example.com.";
  if (email === String(currentEmail).toLowerCase()) return "That’s already your email.";
  return null;
}

// The section the reader is in: the last one whose top has reached `offset`. At the very bottom of the page
// it is always the last, so a short final section can still be reached.
export function activeSection(tops, offset, atBottom) {
  if (tops.length === 0) return null;
  if (atBottom) return tops.at(-1).id;
  let active = tops[0].id;
  for (const { id, top } of tops) if (top <= offset) active = id;
  return active;
}

// The line a section's top must have crossed to count as reached. It sits at `base` down the window, and slides
// down to the bottom edge as the page runs out of scroll, so the short last sections can each be reached in turn
// instead of the last one jumping in alone.
export function reachLine(base, remaining, viewport) {
  const near = Math.min(1, Math.max(0, 1 - remaining / viewport));
  return base + near * (viewport - base);
}
