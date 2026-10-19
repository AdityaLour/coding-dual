import crypto from "crypto";
import pool from "../db/connection.js";
import { getProblem, publicProblem } from "../problem/bank.js";
import { clients, sendTo } from "./clients.js";
import { GRACE_MS, MAX_ATTEMPTS, MAX_RESUMES } from "./limits.js";
import { PROVISIONAL_DUELS, settleDuel } from "./rating.js";

const FINISHED_KEEP_MS = 5 * 60 * 1000;

// Live duels, in memory (short-lived, one server). The database row is the permanent record.
export const duels = {};
const duelByUser = new Map(); // userId -> duelId

// names: { [userId]: username }, ratings: { [userId]: rating }, played: { [userId]: rated duels so far },
// all as they were at the start.
export async function createDuel(
  playerA,
  playerB,
  problem,
  names,
  ratings,
  played,
) {
  const duelId = crypto.randomUUID();
  await pool.execute(
    `INSERT INTO duels (id, problem_id, player_a, player_b, rating_a_before, rating_b_before)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [duelId, problem.id, playerA, playerB, ratings[playerA], ratings[playerB]],
  );
  const duel = {
    duelId,
    playerA,
    playerB,
    problemId: problem.id,
    names,
    ratings,
    played, // only ever sent as "provisional or not"
    startedAt: Date.now(),
    status: "active", // "active" | "finished"
    judging: new Set(), // players with a submission out at the judge (each may have one; the rival may too)
    winner: null,
    endsAt: Date.now() + problem.minutes * 60_000,
    attempts: new Map(), // userId -> judged submissions
    drops: new Map(), // userId -> disconnects so far
    away: new Map(), // userId -> grace timer while disconnected
    expired: false,
    missed: new Map(), // userId -> how the duel ended, for a player who was away at the time
  };
  duel.timer = setTimeout(
    () => onTimeout(duel),
    problem.minutes * 60_000,
  ).unref();
  duels[duelId] = duel;
  duelByUser.set(playerA, duelId).set(playerB, duelId);
  return duel;
}

export const duelOf = (userId) => duels[duelByUser.get(userId)];
export const inActiveDuel = (userId) => duelOf(userId)?.status === "active";
export const opponentOf = (duel, userId) =>
  duel.playerA === userId ? duel.playerB : duel.playerA;
export const attemptsLeft = (duel, userId) =>
  MAX_ATTEMPTS - (duel.attempts.get(userId) ?? 0);

// Everything a player is told about their duel, on match and on resume.
export const duelPayload = (duel, userId) => {
  const opponent = opponentOf(duel, userId);
  return {
    duelId: duel.duelId,
    opponent: duel.names[opponent],
    opponentRating: duel.ratings[opponent],
    rating: duel.ratings[userId],
    problem: publicProblem(getProblem(duel.problemId)),
    endsAt: duel.endsAt,
    attemptsLeft: attemptsLeft(duel, userId),
    now: Date.now(), // lets the client run its clock off the server's
    provisional: duel.played[userId] < PROVISIONAL_DUELS,
    opponentProvisional: duel.played[opponent] < PROVISIONAL_DUELS,
  };
};

// Tells a player how the duel ended. One who is away gets it as soon as they are back.
function deliver(duel, id, message) {
  if (clients.has(id)) sendTo(id, message);
  else duel.missed.set(id, message);
}

function removeDuel(duel) {
  delete duels[duel.duelId];
  for (const id of [duel.playerA, duel.playerB]) {
    if (duelByUser.get(id) === duel.duelId) duelByUser.delete(id);
  }
}

function stop(duel, winner) {
  duel.status = "finished";
  duel.winner = winner;
  clearTimeout(duel.timer);
  duel.away.forEach(clearTimeout);
  duel.away.clear();
  // Lingers briefly so a late submit still gets "Match Over", then is dropped.
  setTimeout(() => removeDuel(duel), FINISHED_KEEP_MS).unref();
}

// What one player is told when the duel ends. ratings = { a, b } as { before, after }, or null if unrated.
// It carries what the result screen needs (names, lengths), so a player who was away still gets all of it.
export function duelEndMessage(duel, id, winnerId, reason, ratings) {
  const mine = ratings && (id === duel.playerA ? ratings.a : ratings.b);
  const theirs = ratings && (id === duel.playerA ? ratings.b : ratings.a);
  const other = opponentOf(duel, id);
  return {
    type: "duelEnd",
    result: winnerId === null ? "draw" : winnerId === id ? "win" : "loss",
    reason,
    opponent: duel.names[other],
    rated: Boolean(ratings),
    ratingBefore: duel.ratings[id],
    ratingAfter: mine?.after ?? duel.ratings[id],
    opponentRatingBefore: duel.ratings[other],
    opponentRatingAfter: theirs?.after ?? duel.ratings[other],
    submissions: duel.attempts.get(id) ?? 0,
    opponentSubmissions: duel.attempts.get(other) ?? 0,
    durationMs: Date.now() - duel.startedAt,
    limitMs: duel.endsAt - duel.startedAt,
  };
}

// The one way a duel ends. The first caller wins the gate; later ones do nothing.
// winnerId = null is a draw. Rating and history change together, in one transaction.
export async function endDuel(duel, winnerId, reason) {
  if (duel.status === "finished") return;
  stop(duel, winnerId);

  let ratings = null;
  try {
    ratings = await settleDuel(duel, winnerId, reason);
  } catch (error) {
    console.error("Settling duel failed:", error); // row stays 'active'; boot cleanup voids it
  }
  for (const id of [duel.playerA, duel.playerB]) {
    deliver(duel, id, duelEndMessage(duel, id, winnerId, reason, ratings));
  }
}

// Nobody is left to play: closed without a result and without touching ratings.
async function voidDuel(duel) {
  if (duel.status === "finished") return;
  stop(duel, null);
  try {
    await pool.execute(
      "UPDATE duels SET status = 'void', ended_at = NOW() WHERE id = ? AND status = 'active'",
      [duel.duelId],
    );
  } catch (error) {
    console.error("Voiding duel failed:", error);
  }
  for (const id of [duel.playerA, duel.playerB]) {
    deliver(duel, id, {
      ...duelEndMessage(duel, id, null, "abandoned", null),
      result: "void",
    });
  }
}

// Sockets and timers don't survive a restart, so any duel still 'active' at boot is dead.
export const voidStaleDuels = () =>
  pool.execute(
    "UPDATE duels SET status = 'void', ended_at = NOW() WHERE status = 'active'",
  );

function onTimeout(duel) {
  // Submissions already being judged decide first (they started before the deadline).
  if (duel.judging.size > 0) duel.expired = true;
  else endDuel(duel, null, "timeout");
}

const forfeit = (duel, userId) =>
  endDuel(duel, opponentOf(duel, userId), "forfeit");

// A player gives up: the same loss as running out of grace time, just sooner.
export function handleForfeit({ userId }) {
  const duel = duelOf(userId);
  if (duel && duel.status !== "finished") return forfeit(duel, userId);
}

function graceOver(duel, userId) {
  duel.away.delete(userId);
  if (duel.status === "finished") return;
  // If the opponent is gone too, nobody forfeits to nobody.
  if (clients.has(opponentOf(duel, userId))) forfeit(duel, userId);
  else voidDuel(duel);
}

// A player's socket closed for good (not just swapped for a new tab).
export function playerLeft(duel, userId) {
  if (duel.status === "finished") return;
  const opponent = opponentOf(duel, userId);
  const drops = (duel.drops.get(userId) ?? 0) + 1;
  duel.drops.set(userId, drops);
  if (drops > MAX_RESUMES && clients.has(opponent))
    return forfeit(duel, userId);
  duel.away.set(
    userId,
    setTimeout(() => graceOver(duel, userId), GRACE_MS).unref(),
  );
  sendTo(opponent, { type: "opponentStatus", away: true, graceMs: GRACE_MS });
}

// A player's socket opened. If they are mid-duel, put them back in it.
export function playerBack(userId) {
  const duel = duelOf(userId);
  if (!duel) return;
  if (duel.status === "finished") {
    const missed = duel.missed.get(userId);
    duel.missed.delete(userId);
    if (missed) sendTo(userId, missed);
    return;
  }
  clearTimeout(duel.away.get(userId));
  duel.away.delete(userId);
  const opponent = opponentOf(duel, userId);
  sendTo(userId, {
    type: "duelResume",
    ...duelPayload(duel, userId),
    opponentAway: duel.away.has(opponent) || !clients.has(opponent),
  });
  sendTo(opponent, { type: "opponentStatus", away: false });
}
