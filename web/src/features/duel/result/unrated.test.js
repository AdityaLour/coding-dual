import test from "node:test";
import assert from "node:assert/strict";
import { buildResult } from "./model.js";

const end = {
  type: "duelEnd",
  result: "win",
  reason: "solved",
  rated: false,
  unratedReason: "pairCap",
  opponent: "lunar-otter",
  ratingBefore: 1200,
  ratingAfter: 1200,
  opponentRatingBefore: 1250,
  opponentRatingAfter: 1250,
  submissions: 1,
  opponentSubmissions: 2,
  durationMs: 300_000,
  limitMs: 900_000,
};

test("a duel past the daily rematch cap is unrated, changes nothing, and says why", () => {
  const r = buildResult(end, { opponent: "lunar-otter", provisional: false, problem: { minutes: 15 } });
  assert.deepEqual([r.rated, r.you.delta, r.rival.delta, r.unratedReason], [false, 0, 0, "pairCap"]);
});

test("an ordinary unrated duel has no special reason", () => {
  const { unratedReason: _gone, ...plain } = end;
  assert.equal(buildResult(plain, null).unratedReason, null);
});
