import test from "node:test";
import assert from "node:assert/strict";
import { buildResult } from "./model.js";

const base = {
  type: "duelEnd",
  rated: true,
  opponent: "lunar-otter",
  ratingBefore: 1200,
  ratingAfter: 1223,
  opponentRatingBefore: 1250,
  opponentRatingAfter: 1227,
  submissions: 2,
  opponentSubmissions: 3,
  durationMs: 581_000,
  limitMs: 900_000,
};
const duel = {
  opponent: "lunar-otter",
  provisional: true,
  problem: { minutes: 15 },
};

test("a win by solving reads as the design does", () => {
  const r = buildResult({ ...base, result: "win", reason: "solved" }, duel);
  assert.deepEqual(
    [r.mode, r.headline, r.reason, r.bar.label, r.bar.kind],
    [
      "win",
      "YOU WON",
      "You solved it first.",
      "You solved it in 9:41 of 15:00",
      "you",
    ],
  );
  assert.deepEqual(
    [
      r.you.delta,
      r.rival.delta,
      r.youWon,
      r.rivalWon,
      r.timeLeftMs,
      r.provisional,
    ],
    [23, -23, true, false, 319_000, true],
  );
});

test("a loss by the rival solving it", () => {
  const r = buildResult(
    {
      ...base,
      result: "loss",
      reason: "solved",
      ratingAfter: 1177,
      opponentRatingAfter: 1273,
    },
    duel,
  );
  assert.deepEqual(
    [r.mode, r.headline, r.reason, r.bar.kind, r.rivalWon, r.you.delta],
    ["loss", "YOU LOST", "Your rival solved it first.", "opp", true, -23],
  );
  assert.equal(r.bar.label, "Your rival solved it in 9:41 of 15:00");
});

test("running out of time is a draw nobody wins", () => {
  const r = buildResult(
    {
      ...base,
      result: "draw",
      reason: "timeout",
      durationMs: 900_050,
      ratingAfter: 1207,
    },
    duel,
  );
  assert.deepEqual(
    [
      r.headline,
      r.reason,
      r.bar.label,
      r.timeLeftMs,
      r.youWon,
      r.rivalWon,
      r.you.delta,
    ],
    [
      "DRAW",
      "Time ran out and nobody solved it.",
      "Nobody solved it in 15:00",
      0,
      false,
      false,
      7,
    ],
  );
});

test("leaving: the winner and the loser are told differently, and resigning is remembered", () => {
  const win = buildResult(
    { ...base, result: "win", reason: "forfeit", durationMs: 510_000 },
    duel,
  );
  assert.deepEqual(
    [win.reason, win.bar.label],
    [
      "Your rival left the duel and did not come back.",
      "Your rival left at 8:30 of 15:00",
    ],
  );
  const dropped = buildResult(
    { ...base, result: "loss", reason: "forfeit", durationMs: 400_000 },
    duel,
    false,
  );
  const resigned = buildResult(
    { ...base, result: "loss", reason: "forfeit", durationMs: 400_000 },
    duel,
    true,
  );
  assert.deepEqual(
    [dropped.reason, resigned.reason, resigned.bar.label],
    [
      "You were disconnected for too long.",
      "You resigned.",
      "You left at 6:40 of 15:00",
    ],
  );
});

test("a called-off duel is unrated and changes nothing", () => {
  const r = buildResult(
    {
      ...base,
      result: "void",
      reason: "abandoned",
      rated: false,
      durationMs: 190_000,
    },
    null,
  );
  assert.deepEqual(
    [
      r.headline,
      r.rated,
      r.you.delta,
      r.you.after,
      r.rival.after,
      r.provisional,
      r.bar.label,
    ],
    ["CANCELLED", false, 0, 1200, 1250, false, "Called off at 3:10 of 15:00"],
  );
});

test("after a reload there is no duel: the end message alone is enough, and a missing length degrades", () => {
  const r = buildResult({ ...base, result: "win", reason: "solved" }, null);
  assert.deepEqual(
    [r.rival.name, r.provisional, r.bar.label],
    ["lunar-otter", false, "You solved it in 9:41 of 15:00"],
  );
  const old = buildResult(
    {
      ...base,
      limitMs: undefined,
      opponent: undefined,
      result: "win",
      reason: "solved",
    },
    null,
  );
  assert.deepEqual(
    [old.rival.name, old.timeLeftMs, old.bar.label, old.barRatio],
    ["Your rival", null, "You solved it in 9:41", 0],
  );
});
