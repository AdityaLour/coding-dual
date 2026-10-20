import test from "node:test";
import assert from "node:assert/strict";
import { createProfile, parseCursor, ProfileError, RECENT } from "./profile.js";

const ME = 7;
const bank = { getProblem: (id) => (id === 99 ? undefined : { title: `Problem ${id}`, topic: "arrays-hashing", difficulty: "Easy" }) };

// A duel from my side, newest first when put in an array. `t` is epoch seconds.
const duel = (n, o = {}) => ({
  id: `00000000-0000-0000-0000-${String(n).padStart(12, "0")}`,
  problemId: 1,
  winnerId: o.win === false ? 50 : o.win === null ? null : ME,
  endReason: o.why ?? "solved",
  rated: o.rated ?? true,
  startedAt: 1000 + n * 1000,
  endedAt: 1000 + n * 1000 + (o.len ?? 300),
  ratingBefore: o.before ?? 1200,
  ratingAfter: o.after === undefined ? 1215 : o.after,
  oppRating: 1250,
  oppId: o.opp ?? 50,
  oppName: o.name ?? "kaito",
});

function setup(rows, extra = {}) {
  const repo = {
    user: async () => ({ id: ME, username: "ada", rating: 1215, duels: rows.length, createdAt: 1_700_000_000_000 }),
    totals: async () => extra.totals ?? { wins: 3, losses: 1, draws: 1, unrated: 1 },
    recent: async (id, limit, opt = {}) => rows.filter((r) => !opt.ratedOnly || r.rated).slice(0, limit),
    page: async (id, filter, cursor, limit) => {
      repo.lastPage = { filter, cursor, limit };
      return rows.slice(0, limit);
    },
    account: async () => ({ email: "a@b.dev", verified: true, password: true, google: false }),
  };
  const leaderboard = {
    standingOf: async () => ({ placing: null, rank: 32, total: 214, week: { gain: 54, duels: 4, qualified: true } }),
  };
  return { profile: createProfile({ repo, leaderboard, bank, now: () => 123 }), repo };
}

test("the summary carries the record, rank, week and last ten from my side", async () => {
  const rows = [duel(5), duel(4), duel(3, { win: false, after: 1200, before: 1215 }), duel(2, { win: null, after: 1200 }), duel(1, { rated: false, after: 1200 })];
  const { profile } = setup(rows);
  const out = await profile.summary(ME);
  assert.equal(out.username, "ada");
  assert.equal(out.rank, 32);
  assert.equal(out.ranked, 214);
  assert.deepEqual(out.week, { gain: 54, duels: 4 });
  assert.deepEqual(out.record, { wins: 3, losses: 1, draws: 1, rated: 5 });
  assert.deepEqual(out.counts, { all: 6, W: 3, L: 1, D: 1, U: 1 });
  assert.deepEqual(out.last10.map((d) => d.result), ["U", "D", "L", "W", "W"]); // oldest first, unrated marked U
  assert.equal(out.recent.length, 5);
  assert.equal(out.now, 123);
});

test("streaks count rated wins only: an unrated duel in between changes nothing", async () => {
  const rows = [duel(6), duel(5, { rated: false }), duel(4), duel(3, { win: false }), duel(2), duel(1), duel(0)];
  const out = await setup(rows).profile.summary(ME);
  assert.equal(out.streak.current, 2);
  assert.equal(out.streak.best, 3);
});

test("peak and low include the start rating only when every duel was read", async () => {
  const rows = [duel(2, { before: 1400, after: 1380 }), duel(1, { before: 1200, after: 1400 })];
  const out = await setup(rows).profile.summary(ME);
  assert.equal(out.peak, 1400);
  assert.equal(out.low, 1200);
});

test("rivals are the most-played opponents with their record against them, rated duels only", async () => {
  const rows = [
    duel(5, { opp: 50, name: "kaito" }),
    duel(4, { opp: 50, name: "kaito", win: false }),
    duel(3, { opp: 51, name: "mira_k" }),
    duel(2, { opp: 50, name: "kaito", rated: false }),
  ];
  const out = await setup(rows).profile.summary(ME);
  assert.deepEqual(out.rivals.map((r) => [r.username, r.duels, r.W, r.L, r.D]), [["kaito", 2, 1, 1, 0], ["mira_k", 1, 1, 0, 0]]);
  assert.equal(out.rivals[0].face, 50 % 5);
});

test("nothing private leaves: no ids or emails in the summary, only names and faces", async () => {
  const out = await setup([duel(1)]).profile.summary(ME);
  const text = JSON.stringify(out);
  assert.ok(!text.includes("oppId") && !text.includes("_opp") && !text.includes("@"));
});

test("an unrated duel moves no rating, and a retired problem still reads", async () => {
  const rows = [duel(2, { rated: false, before: 1215, after: 1215 }), duel(1, { before: 1200, after: 1215 })];
  rows[1].problemId = 99;
  const out = await setup(rows).profile.duels(ME);
  assert.equal(out.duels[0].delta, 0);
  assert.equal(out.duels[0].rated, false);
  assert.equal(out.duels[1].delta, 15);
  assert.equal(out.duels[1].problem.title, "A problem that has been retired");
});

test("a player who has never played still gets a clean summary", async () => {
  const { profile } = setup([], { totals: { wins: 0, losses: 0, draws: 0, unrated: 0 } });
  const out = await profile.summary(ME);
  assert.deepEqual(out.last10, []);
  assert.deepEqual(out.streak, { current: 0, best: 0 });
  assert.equal(out.peak, 1215);
});

test("the rating series is oldest first and numbers each duel among all rated ones", async () => {
  const rows = [duel(3, { before: 1230, after: 1245 }), duel(2, { rated: false }), duel(1, { before: 1215, after: 1230 })];
  const out = await setup(rows, { totals: { wins: 20, losses: 5, draws: 0, unrated: 1 } }).profile.ratingSeries(ME);
  assert.deepEqual(out.points.map((p) => [p.n, p.after]), [[24, 1230], [25, 1245]]);
  assert.equal(out.truncated, true);
  assert.equal(out.total, 25);
});

test("the series is not truncated when every rated duel fits", async () => {
  const out = await setup([duel(1)], { totals: { wins: 1, losses: 0, draws: 0, unrated: 0 } }).profile.ratingSeries(ME);
  assert.equal(out.truncated, false);
  assert.equal(out.points[0].n, 1);
});

test("duels: a page asks for one more row to know whether there is a next page", async () => {
  const rows = Array.from({ length: 13 }, (_, i) => duel(13 - i));
  const { profile, repo } = setup(rows);
  const first = await profile.duels(ME, { filter: "W" });
  assert.equal(repo.lastPage.limit, 13);
  assert.equal(repo.lastPage.filter, "W");
  assert.equal(first.duels.length, 12);
  assert.match(first.next, /^\d+\.[0-9a-f-]{36}$/);
  const last = await profile.duels(ME, { limit: 20 });
  assert.equal(last.next, null);
});

test("duels: a bad filter, cursor or oversized limit is handled", async () => {
  const { profile, repo } = setup([duel(1)]);
  await assert.rejects(profile.duels(ME, { filter: "X" }), (e) => e instanceof ProfileError && e.status === 400);
  await assert.rejects(profile.duels(ME, { cursor: "nope" }), (e) => e.status === 400);
  await profile.duels(ME, { limit: 5000 });
  assert.equal(repo.lastPage.limit, 31); // capped at 30, plus the one extra row
  assert.deepEqual(parseCursor("12.00000000-0000-0000-0000-000000000001"), { endedAt: 12, id: "00000000-0000-0000-0000-000000000001" });
  assert.equal(parseCursor("12;DROP"), null);
});

test("RECENT is a sensible cap", () => {
  assert.ok(RECENT >= 300);
});
