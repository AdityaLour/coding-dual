import test from "node:test";
import assert from "node:assert/strict";
import { initialState, reducer } from "./duelReducer.js";

const run = (events, from = initialState) => events.reduce(reducer, from);
const payload = {
  duelId: "d1",
  opponent: "rival",
  opponentRating: 1250,
  rating: 1200,
  attemptsLeft: 15,
  now: 5000,
  at: 4000,
  endsAt: 605000,
};
const inDuel = () =>
  run([
    {
      type: "welcome",
      username: "me",
      rating: 1200,
      provisional: false,
      at: 1,
    },
    { ...payload, type: "duelResume" },
  ]);

test("welcome keeps the rating; one that failed to load does not erase a known one", () => {
  const known = run([
    { type: "welcome", username: "me", rating: 1200, provisional: true },
  ]);
  assert.deepEqual(known.me, {
    username: "me",
    rating: 1200,
    provisional: true,
  });
  assert.equal(
    reducer(known, { type: "welcome", username: "me", rating: null }).me.rating,
    1200,
  );
});

test("search -> matchFound -> end, with the server clock offset", () => {
  const searching = run([{ type: "ui/search", at: 10 }]);
  assert.equal(searching.phase, "searching");
  const found = reducer(searching, { ...payload, type: "matchFound" });
  assert.deepEqual(
    [found.phase, found.offset, found.duel.opponent],
    ["found", 1000, "rival"],
  );
  const ended = reducer(found, {
    type: "duelEnd",
    result: "win",
    rated: true,
    ratingAfter: 1226,
  });
  assert.deepEqual([ended.phase, ended.end.result], ["ended", "win"]);
});

test("a rated end updates the rating shown at home; an unrated one does not", () => {
  const rated = reducer(inDuel(), {
    type: "duelEnd",
    result: "win",
    rated: true,
    ratingAfter: 1226,
  });
  assert.equal(rated.me.rating, 1226);
  const voided = reducer(inDuel(), {
    type: "duelEnd",
    result: "void",
    rated: false,
  });
  assert.equal(voided.me.rating, 1200);
});

test("results are recorded in order and update the attempts left", () => {
  const state = run(
    [
      { type: "ui/submitted" },
      {
        type: "result",
        correct: false,
        verdict: "Wrong Answer",
        failedTest: 3,
        runtimeMs: 40,
        attemptsLeft: 14,
        at: 5,
      },
    ],
    inDuel(),
  );
  assert.deepEqual(
    [state.judging, state.attempts.length, state.duel.attemptsLeft],
    [false, 1, 14],
  );
  assert.equal(state.attempts[0].verdict, "Wrong Answer");
});

test("a Judge Error tells the player it was not counted", () => {
  const state = reducer(inDuel(), {
    type: "result",
    correct: false,
    verdict: "Judge Error",
    attemptsLeft: 15,
    at: 1,
  });
  assert.match(state.notice, /not counted/);
});

test("a resume of the same duel keeps the attempts; a different duel starts clean", () => {
  const withAttempt = reducer(inDuel(), {
    type: "result",
    correct: false,
    verdict: "Wrong Answer",
    attemptsLeft: 14,
    at: 1,
  });
  assert.equal(
    reducer(withAttempt, { ...payload, type: "duelResume" }).attempts.length,
    1,
  );
  assert.equal(
    reducer(withAttempt, { ...payload, duelId: "d2", type: "duelResume" })
      .attempts.length,
    0,
  );
});

test("opponent away and back; a resume can say they are already away", () => {
  const away = reducer(inDuel(), {
    type: "opponentStatus",
    away: true,
    graceMs: 30000,
    at: 99,
  });
  assert.deepEqual(away.away, { graceMs: 30000, since: 99 });
  assert.equal(
    reducer(away, { type: "opponentStatus", away: false }).away,
    null,
  );
  assert.deepEqual(
    reducer(inDuel(), { ...payload, type: "duelResume", opponentAway: true })
      .away,
    { graceMs: null, since: 4000 },
  );
});

test("reconnecting mid-duel waits for the resume, and gives up if it never comes", () => {
  const syncing = reducer(inDuel(), {
    type: "welcome",
    username: "me",
    rating: 1200,
  });
  assert.equal(syncing.syncing, true);
  assert.equal(
    reducer(syncing, { ...payload, type: "duelResume" }).syncing,
    false,
  );
  const lost = reducer(syncing, { type: "ui/desync" });
  assert.deepEqual([lost.phase, lost.note, lost.duel], ["idle", "lost", null]);
  assert.equal(reducer(inDuel(), { type: "ui/desync" }).phase, "duel"); // not syncing: nothing to give up
});

test("search failures stop the search with a reason; a stale cancel ack changes nothing", () => {
  const searching = run([{ type: "ui/search", at: 1 }]);
  assert.equal(reducer(searching, { type: "noMatch" }).note, "noMatch");
  assert.equal(
    reducer(searching, { type: "error", code: "inDuel" }).note,
    "inDuel",
  );
  assert.equal(
    reducer(searching, { type: "error", code: "rateLimited" }).note,
    "busy",
  );
  assert.equal(
    reducer(searching, { type: "error", code: "alreadyQueued" }).phase,
    "searching",
  );
  assert.equal(
    reducer(searching, { type: "error", code: "serverError" }).phase,
    "searching",
  ); // the server re-queues
  assert.equal(
    reducer(searching, { type: "matchCancelled" }).phase,
    "searching",
  ); // ack of an earlier cancel
});

test("a match becomes play only when the duel screen says so", () => {
  const found = reducer(run([{ type: "ui/search", at: 1 }]), {
    ...payload,
    type: "matchFound",
  });
  assert.equal(found.phase, "found");
  assert.equal(reducer(found, { type: "ui/begin" }).phase, "duel");
  assert.equal(
    reducer(run([{ type: "ui/search", at: 1 }]), { type: "ui/begin" }).phase,
    "searching",
  ); // nothing to begin
});

test("a search cannot start while a duel is live", () => {
  assert.equal(reducer(inDuel(), { type: "ui/search", at: 1 }).phase, "duel");
});

test("the server losing our duel resets us; leaving after a result gives a clean slate", () => {
  assert.equal(
    reducer(inDuel(), { type: "duelError", message: "No duel found" }).note,
    "lost",
  );
  const ended = reducer(inDuel(), {
    type: "duelEnd",
    result: "loss",
    rated: true,
    ratingAfter: 1180,
  });
  const left = reducer(ended, { type: "ui/leave" });
  assert.deepEqual(
    [left.phase, left.duel, left.end, left.me.rating],
    ["idle", null, null, 1180],
  );
});

test("a stuck judge flag clears with a notice, but only if it is still set", () => {
  const stuck = reducer(inDuel(), { type: "ui/submitted" });
  assert.match(
    reducer(stuck, { type: "ui/judgeTimeout" }).notice,
    /did not answer/,
  );
  assert.equal(reducer(inDuel(), { type: "ui/judgeTimeout" }).notice, null);
});

test("resigning is remembered through a resume of the same duel and forgotten for a new one", () => {
  const resigned = reducer(inDuel(), { type: "ui/resigned" });
  assert.equal(resigned.resigned, true);
  assert.equal(
    reducer(resigned, { ...payload, type: "duelResume" }).resigned,
    true,
  );
  assert.equal(
    reducer(resigned, { ...payload, duelId: "d2", type: "matchFound" })
      .resigned,
    false,
  );
  assert.equal(reducer(resigned, { type: "ui/leave" }).resigned, false);
});
