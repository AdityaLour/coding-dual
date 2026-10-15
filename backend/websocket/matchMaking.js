import fs from "fs";
import redisClient from "../redis/connection.js";
import pool from "../db/connection.js";
import { problems } from "../problem/problem.js";
import { clients, sendTo } from "./clients.js";
import { createDuel, inActiveDuel } from "./duels.js";

const QUEUE = "matchmakingQueue"; // sorted set: userId scored by rating
const TIMES = "matchmakingTimes"; // hash: userId -> arrival time (ms)
const claimScript = fs.readFileSync("redis/matchmaking.lua", "utf8");
const problem = problems.addTwoNum.desc;

// Rating window: starts at START_WIDTH, grows GROW every STEP_MS, stops at MAX_WIDTH.
const START_WIDTH = 100;
const GROW = 60;
const MAX_WIDTH = 500;
const STEP_MS = 4000;

let sweepTimer = null;
let sweeping = false;

const widthAfter = (waitedMs) =>
  Math.min(START_WIDTH + Math.floor(waitedMs / STEP_MS) * GROW, MAX_WIDTH);

const claim = (userId, rating, width) =>
  redisClient.eval(claimScript, {
    keys: [QUEUE, TIMES],
    arguments: [String(rating - width), String(rating + width), String(userId)],
  });

// Sockets don't survive a restart, so anything still queued at boot is a ghost.
export const resetQueue = () => redisClient.del([QUEUE, TIMES]);

// True if the user was actually queued.
export async function leaveQueue(userId) {
  const [removed] = await redisClient
    .multi()
    .zRem(QUEUE, String(userId))
    .hDel(TIMES, String(userId))
    .exec();
  return removed > 0;
}

// The rating always comes from the database, never from the client.
async function enqueue(userId) {
  const [[row]] = await pool.execute("SELECT rating FROM users WHERE id = ?", [
    userId,
  ]);
  await redisClient
    .multi()
    .zAdd(QUEUE, { score: row.rating, value: String(userId) })
    .hSet(TIMES, String(userId), String(Date.now()))
    .exec();
  sweepTimer ??= setInterval(runSweep, STEP_MS);
  return row.rating;
}

// Both ids were just removed from the queue by the claim script.
function pair(aId, bId) {
  const [a, b] = [Number(aId), Number(bId)];
  if (!clients.has(a) || !clients.has(b)) {
    // One has vanished: put the one still here back in the queue.
    return Promise.all(
      [a, b].filter((id) => clients.has(id)).map((id) => enqueue(id)),
    );
  }
  const duelId = createDuel(a, b);
  sendTo(a, {
    type: "matchFound",
    opponent: clients.get(b).username,
    problem,
    duelId,
  });
  sendTo(b, {
    type: "matchFound",
    opponent: clients.get(a).username,
    problem,
    duelId,
  });
}

async function runSweep() {
  if (sweeping) return;
  sweeping = true;
  try {
    for (const { value, score } of await redisClient.zRangeWithScores(
      QUEUE,
      0,
      -1,
    )) {
      const arrival = Number(await redisClient.hGet(TIMES, value));
      if (!arrival) continue;

      const width = widthAfter(Date.now() - arrival);
      const opponent = await claim(value, score, width);
      if (opponent) await pair(value, opponent);
      else if (width >= MAX_WIDTH && (await leaveQueue(value))) {
        sendTo(Number(value), { type: "noMatch" });
      }
    }
    if ((await redisClient.zCard(QUEUE)) === 0) {
      clearInterval(sweepTimer);
      sweepTimer = null;
    }
  } catch (error) {
    console.error("Matchmaking sweep failed:", error);
  } finally {
    sweeping = false;
  }
}

export async function handleFindMatch({ userId }) {
  if (inActiveDuel(userId))
    return sendTo(userId, { type: "error", code: "inDuel" });
  if ((await redisClient.zScore(QUEUE, String(userId))) !== null) {
    return sendTo(userId, { type: "error", code: "alreadyQueued" });
  }

  const rating = await enqueue(userId);
  const opponent = await claim(userId, rating, START_WIDTH);
  if (opponent) await pair(userId, opponent);
}

export async function handleCancelMatch({ userId }) {
  await leaveQueue(userId);
  sendTo(userId, { type: "matchCancelled" });
}
