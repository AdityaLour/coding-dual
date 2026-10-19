import test from "node:test";
import assert from "node:assert/strict";
import { nextRating, PROVISIONAL_DUELS } from "./rating.js";

test("equal players: the winner gains and the loser loses the same, K=40 while provisional", () => {
  assert.equal(nextRating(1200, 1200, 0, 1), 1220);
  assert.equal(nextRating(1200, 1200, 0, 0), 1180);
});

test("K drops to 24 once the player is established", () => {
  assert.equal(nextRating(1200, 1200, PROVISIONAL_DUELS, 1), 1212);
});

test("a draw between equals changes nothing; a draw against a stronger player gains", () => {
  assert.equal(nextRating(1200, 1200, 20, 0.5), 1200);
  assert.ok(nextRating(1200, 1400, 20, 0.5) > 1200);
});

test("beating a much stronger player gains more than beating an equal one", () => {
  assert.ok(nextRating(1200, 1600, 20, 1) - 1200 > nextRating(1200, 1200, 20, 1) - 1200);
});

test("ratings stay inside the floor and ceiling", () => {
  assert.equal(nextRating(100, 3500, 20, 0), 100);
  assert.equal(nextRating(3500, 100, 20, 1), 3500);
});
