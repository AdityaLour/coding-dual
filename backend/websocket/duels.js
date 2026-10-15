import crypto from "crypto";

const FINISHED_KEEP_MS = 5 * 60 * 1000;

export const duels = {};
const duelByUser = new Map(); // userId -> duelId

export function createDuel(playerA, playerB) {
  const duelId = crypto.randomUUID();
  duels[duelId] = { duelId, playerA, playerB, status: "waiting", winner: null };
  duelByUser.set(playerA, duelId).set(playerB, duelId);
  return duelId;
}

export const duelOf = (userId) => duels[duelByUser.get(userId)];

export const inActiveDuel = (userId) =>
  ["waiting", "judging"].includes(duelOf(userId)?.status);

export const opponentOf = (duel, userId) =>
  duel.playerA === userId ? duel.playerB : duel.playerA;

export function removeDuel(duel) {
  delete duels[duel.duelId];
  for (const id of [duel.playerA, duel.playerB]) {
    if (duelByUser.get(id) === duel.duelId) duelByUser.delete(id);
  }
}

// A finished duel lingers briefly so a late submit still gets "Match Over", then is dropped.
export function finishDuel(duel, winner) {
  duel.status = "finished";
  duel.winner = winner;
  setTimeout(() => removeDuel(duel), FINISHED_KEEP_MS).unref();
}
