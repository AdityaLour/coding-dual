import test from "node:test";
import assert from "node:assert/strict";
import { parseInline, parseStatement } from "./statement.js";

test("inline code, bold and italic are told apart, and math with spaced stars is left alone", () => {
  assert.deepEqual(parseInline("Is `i < j` **different** and *distinct*?"), [
    { type: "text", text: "Is " },
    { type: "code", text: "i < j" },
    { type: "text", text: " " },
    { type: "bold", text: "different" },
    { type: "text", text: " and " },
    { type: "italic", text: "distinct" },
    { type: "text", text: "?" },
  ]);
  assert.deepEqual(parseInline("2 * 10^9 and 3 * 4"), [
    { type: "text", text: "2 * 10^9 and 3 * 4" },
  ]);
  assert.deepEqual(parseInline("`-2 * 10^9 <= k`"), [
    { type: "code", text: "-2 * 10^9 <= k" },
  ]);
});

test("a statement becomes headings, paragraphs and one list per run of bullets", () => {
  const blocks = parseStatement(
    "Find it.\nReally.\n\n## Input\nOne line.\n\n## Constraints\n- `n <= 5`\n- `a_i >= 0`\n\nNote this.\n",
  );
  assert.deepEqual(
    blocks.map((block) => block.type),
    ["paragraph", "heading", "paragraph", "heading", "list", "paragraph"],
  );
  assert.deepEqual(blocks[0].parts, [
    { type: "text", text: "Find it. Really." },
  ]);
  assert.equal(blocks[4].items.length, 2);
});

test("markup in a statement stays plain text", () => {
  const [block] = parseStatement(
    '<img src=x onerror="alert(1)"> and [link](javascript:alert(1))',
  );
  assert.deepEqual(block.parts, [
    {
      type: "text",
      text: '<img src=x onerror="alert(1)"> and [link](javascript:alert(1))',
    },
  ]);
});

test("empty or missing statements give no blocks", () => {
  assert.deepEqual(parseStatement(""), []);
  assert.deepEqual(parseStatement(undefined), []);
});
