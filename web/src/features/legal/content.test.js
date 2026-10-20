import test from "node:test";
import assert from "node:assert/strict";
import { CONTACT, PRIVACY, TERMS, splitContact } from "./content.js";

const allText = (doc) =>
  doc.sections
    .flatMap((s) => [s.heading, ...s.body.flatMap((b) => (typeof b === "string" ? [b] : b.list))])
    .join("\n");

test("every section has a heading and some words", () => {
  for (const doc of [PRIVACY, TERMS]) {
    assert.ok(doc.title && doc.lead);
    for (const section of doc.sections) {
      assert.ok(section.heading.length > 0);
      assert.ok(section.body.length > 0);
    }
  }
});

test("the privacy page names what it must: Google sign-in, Resend, cookies, deleting", () => {
  const text = allText(PRIVACY);
  for (const word of ["Google", "Resend", "cookie", "delete", "password", "anonymous"]) {
    assert.match(text, new RegExp(word, "i"), word);
  }
});

test("the pages point to the Contact page and carry no email address of their own", () => {
  for (const doc of [PRIVACY, TERMS]) {
    const text = allText(doc);
    assert.match(text, /\{contact\}/);
    assert.doesNotMatch(text, /@/);
  }
  assert.ok(CONTACT.title);
});

test("nothing about how Boip is built or secured is given away", () => {
  const text = allText(PRIVACY) + allText(TERMS);
  for (const word of ["Judge0", "Redis", "MySQL", "bcrypt", "SHA", "token", "WebSocket", "rate limit"]) {
    assert.doesNotMatch(text, new RegExp(`\\b${word}\\b`, "i"), word);
  }
});

test("splitContact keeps the text around the link marker", () => {
  assert.deepEqual(splitContact("Use the {contact}."), ["Use the ", "{contact}", "."]);
  assert.deepEqual(splitContact("No link."), ["No link."]);
});
