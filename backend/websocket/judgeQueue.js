import { AsyncLocalStorage } from "node:async_hooks";
import { JUDGE_SLOTS } from "./limits.js";

// How long a practice call waits behind duels before it is allowed to jump the queue.
export const PRACTICE_AGE_MS = 8_000;
// While duel calls are waiting, an aged practice call gets every third slot at most.
const DUEL_TURNS_BEFORE_PRACTICE = 2;

// Who is asking: set once around a whole judging run, so every Judge0 call inside it
// (the build and every test) inherits it without passing a flag through each function.
const caller = new AsyncLocalStorage();
export const asPractice = (work) => caller.run("practice", work);
export const currentCaller = () => caller.getStore() ?? "duel";

// A pool of `slots` Judge0 calls at once. Duel calls always go first; a practice call that has waited
// `ageMs` may go ahead of them, but only after two duel calls have been served, so neither side starves.
export function createQueue(slots, ageMs = PRACTICE_AGE_MS, now = Date.now) {
  let free = slots;
  let duelStreak = 0;
  const duel = [];
  const practice = [];

  function next() {
    if (duel.length === 0) {
      duelStreak = 0;
      return practice.shift() ?? null;
    }
    const oldest = practice[0];
    if (
      oldest &&
      now() - oldest.since >= ageMs &&
      duelStreak >= DUEL_TURNS_BEFORE_PRACTICE
    ) {
      duelStreak = 0;
      return practice.shift();
    }
    duelStreak++;
    return duel.shift();
  }

  return {
    acquire(kind = caller.getStore() ?? "duel") {
      if (free > 0) {
        free--;
        return Promise.resolve();
      }
      return new Promise((resolve) =>
        (kind === "practice" ? practice : duel).push({
          resolve,
          since: now(),
        }),
      );
    },
    release() {
      const waiter = next();
      if (waiter) waiter.resolve();
      else free++;
    },
    stats: () => ({ free, duelWaiting: duel.length, practiceWaiting: practice.length }),
  };
}

const queue = createQueue(JUDGE_SLOTS);
export const acquire = queue.acquire;
export const release = queue.release;
export const queueStats = queue.stats;
