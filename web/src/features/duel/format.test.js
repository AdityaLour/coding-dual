import test from "node:test";
import assert from "node:assert/strict";
import {
  formatClock,
  formatDelta,
  formatElapsed,
  formatRating,
} from "./format.js";

test("a countdown rounds up and an elapsed time rounds down", () => {
  assert.equal(formatClock(61_001), "1:02");
  assert.equal(formatClock(1), "0:01");
  assert.equal(formatClock(-500), "0:00");
  assert.equal(formatElapsed(581_999), "9:41");
  assert.equal(formatElapsed(0), "0:00");
});

test("ratings and rating changes read plainly", () => {
  assert.equal(formatRating(1200, false), "1200");
  assert.equal(formatRating(1200, true), "1200, provisional");
  assert.equal(formatRating(null, false), "Unranked");
  assert.deepEqual(
    [formatDelta(23), formatDelta(-17), formatDelta(0)],
    ["+23", "−17", "0"],
  );
});
