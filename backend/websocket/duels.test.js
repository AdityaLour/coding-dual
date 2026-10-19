import test from "node:test";
import assert from "node:assert/strict";
import { duelEndMessage } from "./duels.js";

const startedAt = Date.now() - 90_000;
const duel = {
  playerA: 1,
  playerB: 2,
  names: { 1: "ann_dev", 2: "bob_dev" },
  ratings: { 1: 1200, 2: 1300 },
  attempts: new Map([[1, 3]]),
  startedAt,
  endsAt: startedAt + 15 * 60_000,
};
const settled = {
  a: { before: 1200, after: 1226 },
  b: { before: 1300, after: 1270 },
};

test("duelEnd tells each player their own side of the head-to-head", () => {
  const forA = duelEndMessage(duel, 1, 1, "solved", settled);
  assert.deepEqual(
    [
      forA.result,
      forA.ratingBefore,
      forA.ratingAfter,
      forA.opponentRatingBefore,
      forA.opponentRatingAfter,
    ],
    ["win", 1200, 1226, 1300, 1270],
  );
  assert.deepEqual(
    [forA.submissions, forA.opponentSubmissions, forA.rated],
    [3, 0, true],
  );
  assert.ok(forA.durationMs >= 90_000 && forA.durationMs < 95_000);

  const forB = duelEndMessage(duel, 2, 1, "solved", settled);
  assert.deepEqual(
    [
      forB.result,
      forB.ratingBefore,
      forB.ratingAfter,
      forB.opponentRatingBefore,
      forB.opponentRatingAfter,
    ],
    ["loss", 1300, 1270, 1200, 1226],
  );
  assert.deepEqual([forB.submissions, forB.opponentSubmissions], [0, 3]);
});

test("duelEnd names the rival and the duel's full length, so the result screen needs nothing else", () => {
  assert.deepEqual(
    [
      duelEndMessage(duel, 1, 1, "solved", settled).opponent,
      duelEndMessage(duel, 2, 1, "solved", settled).opponent,
    ],
    ["bob_dev", "ann_dev"],
  );
  assert.equal(
    duelEndMessage(duel, 1, 1, "solved", settled).limitMs,
    15 * 60_000,
  );
});

test("an unsettled duel reports unchanged ratings and a draw has no winner", () => {
  const message = duelEndMessage(duel, 1, null, "timeout", null);
  assert.deepEqual(
    [
      message.result,
      message.rated,
      message.ratingAfter,
      message.opponentRatingAfter,
    ],
    ["draw", false, 1200, 1300],
  );
});
