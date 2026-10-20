import test from "node:test";
import assert from "node:assert/strict";
import { clockDigits, clockText, dateLabel, daysText, refreshDelay, skewOf } from "./time.js";

test("clockDigits: hours, minutes and seconds left, two digits each", () => {
  assert.equal(clockDigits(0), "000000");
  assert.equal(clockDigits(61_000), "000101");
  assert.equal(clockDigits(23 * 3_600_000 + 59 * 60_000 + 59_000), "235959");
});

test("clockDigits: rounds a part second up, so 00:00:00 means the day is over", () => {
  assert.equal(clockDigits(1), "000001");
  assert.equal(clockDigits(999), "000001");
});

test("clockDigits: never negative, never more than two hour digits", () => {
  assert.equal(clockDigits(-5000), "000000");
  assert.equal(clockDigits(200 * 3_600_000), "990000");
});

test("clockText puts colons in", () => {
  assert.equal(clockText("062233"), "06:22:33");
});

test("skewOf: positive when the device is behind the server", () => {
  assert.equal(skewOf(10_000, 4_000), 6_000);
  assert.equal(skewOf(4_000, 10_000), -6_000);
});

test("refreshDelay waits until just after the day ends, and is never zero", () => {
  assert.equal(refreshDelay(100_000, 40_000), 62_000);
  assert.equal(refreshDelay(100_000, 150_000), 2_000);
});

test("dateLabel uses the IST date as given", () => {
  assert.equal(dateLabel("2026-10-21"), "Wed 21 Oct");
  assert.equal(dateLabel("2026-01-01"), "Thu 1 Jan");
});

test("daysText", () => {
  assert.equal(daysText(0), "0 days");
  assert.equal(daysText(1), "1 day");
  assert.equal(daysText(12), "12 days");
});
