import test from "node:test";
import assert from "node:assert/strict";
import {
  activeSection, chartGeometry, chartPoints, clock, emailProblem, nearestIndex, passwordChecks,
  passwordProblem, passwordStrength, placementSpan, pointText, practiceSummary, rangeLabel, resultTag,
  reachLine, storyOf, stripCells, tabOf, whenText,
} from "./logic.js";

test("an unknown tab falls back to overview", () => {
  assert.equal(tabOf("duels"), "duels");
  assert.equal(tabOf("nope"), "overview");
  assert.equal(tabOf(undefined), "overview");
});

test("clock and when read plainly", () => {
  assert.equal(clock(495), "8:15");
  assert.equal(clock(60), "1:00");
  const now = new Date(2026, 9, 20, 14, 0).getTime();
  assert.equal(whenText(now - 30_000, now), "Just now");
  assert.equal(whenText(now - 5 * 60_000, now), "5m ago");
  assert.equal(whenText(now - 3 * 3600_000, now), "3h ago");
  assert.equal(whenText(now - 30 * 3600_000, now), "Yesterday");
  assert.equal(whenText(new Date(2026, 9, 11, 12).getTime(), now), "11 Oct");
});

test("a duel that did not count shows as U whatever the result was", () => {
  assert.equal(resultTag({ rated: true, result: "W" }), "W");
  assert.equal(resultTag({ rated: false, result: "W" }), "U");
});

test("how a duel ended is told from the player's side", () => {
  assert.equal(storyOf({ result: "W", why: "solved" }), "You solved it first.");
  assert.equal(storyOf({ result: "W", why: "forfeit" }), "Your rival left the duel.");
  assert.equal(storyOf({ result: "L", why: "solved" }), "Your rival solved it first.");
  assert.equal(storyOf({ result: "L", why: "forfeit" }), "You left the duel.");
  assert.equal(storyOf({ result: "D", why: "timeout" }), "Time ran out and nobody solved it.");
});

test("the form strip is always ten slots, empty ones in front", () => {
  const cells = stripCells([{ result: "W", opponent: "kaito", delta: 12 }, { result: "U", opponent: "mira_k", delta: 0 }]);
  assert.equal(cells.length, 10);
  assert.equal(cells.slice(0, 8).every((c) => c.result === null), true);
  assert.equal(cells[8].tip, "kaito · +12");
  assert.equal(cells[9].tip, "mira_k · unrated");
  assert.equal(stripCells([]).length, 10);
});

const series = (n, truncated = false) => ({
  start: 1200,
  truncated,
  total: n,
  placementDuels: 5,
  points: Array.from({ length: n }, (_, i) => ({ n: i + 1, t: 0, after: 1200 + (i + 1) * 10, delta: 10, result: "W", opponent: "kaito" })),
});

test("chart points: the range plus the one before it; all time starts from 1200", () => {
  assert.equal(chartPoints(series(40), 10).length, 11);
  assert.equal(chartPoints(series(40), "all").length, 41);
  assert.equal(chartPoints(series(40), "all")[0].start, true);
  assert.equal(chartPoints(series(4), 10).length, 5);
  assert.equal(chartPoints(series(40, true), "all")[0].start, undefined); // older duels exist: no start point
});

test("the range buttons say what they show", () => {
  assert.equal(rangeLabel(10, series(40)), "Last 10");
  assert.equal(rangeLabel("all", series(40)), "All time");
  assert.equal(rangeLabel("all", series(300, true)), "Last 300");
});

test("geometry keeps every point inside the box, and the pointer finds the nearest duel", () => {
  const points = chartPoints(series(20), "all");
  const g = chartGeometry(points, 700, 330);
  for (let i = 0; i < points.length; i++) {
    assert.ok(g.x(i) >= 46 && g.x(i) <= 700 - 18);
    assert.ok(g.y(points[i].after) >= 22 && g.y(points[i].after) <= 330 - 28);
  }
  assert.ok(g.lo <= 1200 && g.hi >= 1400);
  assert.equal(nearestIndex(g.x(7) + 3, g), 7);
  assert.equal(nearestIndex(-50, g), 0);
  assert.equal(nearestIndex(9999, g), points.length - 1);
  assert.equal(chartGeometry([{ after: 1500 }], 400, 200).hi > 1500, true); // one point does not divide by zero
});

test("the placement stretch is shaded only when the first duels are in view", () => {
  assert.deepEqual(placementSpan(chartPoints(series(20), "all"), 5), { from: 0, to: 5 });
  assert.equal(placementSpan(chartPoints(series(40), 10), 5), null);
});

test("the tooltip text for a point and for the start", () => {
  assert.equal(pointText({ start: true, after: 1200 }).title, "Starting rating");
  const text = pointText({ n: 3, t: new Date(2026, 9, 11, 12).getTime(), after: 1230, delta: -7, result: "L", opponent: "kaito" });
  assert.equal(text.title, "Duel 3 · 11 Oct");
  assert.equal(text.detail, "1230 (−7) lost vs kaito");
});

test("practice summary: topics in learning order, solved, this week", () => {
  const now = new Date(2026, 9, 20).getTime();
  const list = [
    { slug: "a", topic: "trees", difficulty: "Hard", solved: true, attempts: 2, solvedAt: new Date(now - 86400000).toISOString(), rating: 1700 },
    { slug: "b", topic: "arrays-hashing", difficulty: "Easy", solved: true, attempts: 1, solvedAt: new Date(now - 20 * 86400000).toISOString(), rating: 900 },
    { slug: "c", topic: "arrays-hashing", difficulty: "Easy", solved: false, attempts: 3, solvedAt: null, rating: 950 },
    { slug: "d", topic: "graphs", difficulty: "Medium", solved: false, attempts: 0, solvedAt: null, rating: 1300 },
  ];
  const out = practiceSummary(list, now);
  assert.deepEqual(out.topics.map((t) => t.slug), ["arrays-hashing", "trees", "graphs"]);
  assert.equal(out.solved, 2);
  assert.equal(out.total, 4);
  assert.equal(out.attempted, 3);
  assert.equal(out.submissions, 6);
  assert.equal(out.thisWeek, 1);
  assert.equal(out.recent[0].slug, "a");
});

test("password rules, strength and the first problem to show", () => {
  assert.deepEqual(passwordChecks({ current: "old", next: "abc", confirm: "abd" }), { len: false, mix: false, diff: true, match: false });
  assert.equal(passwordChecks({ next: "sunrise2026", confirm: "sunrise2026" }, false).diff, true);
  assert.equal(passwordStrength(""), 0);
  assert.equal(passwordStrength("abc"), 1);
  assert.equal(passwordStrength("sunrise2026"), 2);
  assert.equal(passwordStrength("sunrise20261"), 3);
  assert.equal(passwordStrength("Sunrise2026ok!"), 4);
  assert.equal(passwordProblem({ current: "", next: "x", confirm: "x" }).field, "current");
  assert.equal(passwordProblem({ current: "old", next: "short1", confirm: "short1" }).field, "next");
  assert.equal(passwordProblem({ current: "sunrise2026", next: "sunrise2026", confirm: "sunrise2026" }).field, "next");
  assert.equal(passwordProblem({ current: "old", next: "sunrise2026", confirm: "sunrise2027" }).field, "confirm");
  assert.equal(passwordProblem({ current: "old", next: "sunrise2026", confirm: "sunrise2026" }), null);
  assert.equal(passwordProblem({ next: "sunrise2026", confirm: "sunrise2026" }, false), null); // no current password to give
});

test("email problems", () => {
  assert.match(emailProblem("nope", "a@b.dev"), /valid email/);
  assert.match(emailProblem(" A@B.dev ", "a@b.dev"), /already/);
  assert.equal(emailProblem("new@b.dev", "a@b.dev"), null);
});

test("the section being read: the last one whose top has reached the line; the last at the bottom", () => {
  const tops = [{ id: "profile", top: -300 }, { id: "email", top: -20 }, { id: "password", top: 140 }, { id: "devices", top: 700 }];
  assert.equal(activeSection(tops, 120, false), "email");
  assert.equal(activeSection(tops, 150, false), "password");
  assert.equal(activeSection([{ id: "profile", top: 300 }, { id: "email", top: 900 }], 120, false), "profile");
  assert.equal(activeSection(tops, 120, true), "devices");
  assert.equal(activeSection([], 120, false), null);
});

test("the reach line sits at the base mid-page and slides to the bottom edge as the scroll runs out", () => {
  assert.equal(reachLine(150, 5000, 700), 150);
  assert.equal(reachLine(150, 700, 700), 150);
  assert.equal(reachLine(150, 0, 700), 700);
  assert.equal(reachLine(150, 350, 700), 425);
});
