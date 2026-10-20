import test from "node:test";
import assert from "node:assert/strict";
import { compareTopics } from "./topics.js";

test("topics follow the order a beginner learns them, unknown ones last", () => {
  const slugs = ["graphs", "zebra", "arrays-hashing", "backtracking", "linked-lists", "strings", "alpha"];
  assert.deepEqual(slugs.sort(compareTopics), [
    "arrays-hashing",
    "strings",
    "linked-lists",
    "backtracking",
    "graphs",
    "alpha",
    "zebra",
  ]);
});
