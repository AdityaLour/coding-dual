import fs from "fs";
import crypto from "crypto";
import redisClient from "../redis/connection.js";
import { problems } from "../problem/problem.js";
import { duels } from "./duels.js";

const matchmakingScript = fs.readFileSync("redis/matchmaking.lua", "utf8");

let sweepTimer = null;
const ques = problems.addTwoNum.desc;

async function runSweep(clients) {
  const waiting = await redisClient.zRangeWithScores("matchmakingQueue", 0, -1);

  for (const player of waiting) {
    const id = player.value;
    const rating = player.score;

    const arrival = await redisClient.hGet("matchmakingTimes", id);
    if (!arrival) continue;

    const waited = Date.now() - Number(arrival);

    const step = Math.floor(waited / 4000);
    let width = 100 + step * 60;
    if (width > 500) width = 500;

    const low = rating - width;
    const high = rating + width;

    const opponent = await redisClient.eval(matchmakingScript, {
      keys: ["matchmakingQueue", "matchmakingTimes"],
      arguments: [String(low), String(high), id],
    });

    if (opponent) {
      await redisClient.zRem("matchmakingQueue", id);
      await redisClient.hDel("matchmakingTimes", id);

      const meClient = clients.find((c) => c.id === id);
      const opponentClient = clients.find((c) => c.id === opponent);

      if (meClient && opponentClient) {
        const newDuelId = crypto.randomUUID();

        duels[newDuelId] = {
          duelId: newDuelId,
          playerA: meClient.id,
          playerB: opponentClient.id,
          status: "waiting",
          winner: null,
        };

        opponentClient.duelId = newDuelId;
        meClient.duelId = newDuelId;
        meClient.socket.send(
          JSON.stringify({
            type: "matchFound",
            opponentId: opponent,
            problem: ques,
            duelId: newDuelId,
          }),
        );
        opponentClient.socket.send(
          JSON.stringify({
            type: "matchFound",
            opponentId: id,
            problem: ques,
            duelId: newDuelId,
          }),
        );

        console.log("Sweep matched:", id, "vs", opponent);
      }
    } else if (width >= 500) {
      const meClient = clients.find((c) => c.id === id);
      if (meClient) {
        meClient.socket.send(JSON.stringify({ type: "noMatch" }));
      }
      await redisClient.zRem("matchmakingQueue", id);
      await redisClient.hDel("matchmakingTimes", id);
      console.log("No match within cap, removed:", id);
    }
  }

  const count = await redisClient.zCard("matchmakingQueue");
  if (count === 0) {
    clearInterval(sweepTimer);
    sweepTimer = null;
  }
}

export async function handleFindMatch(ws, clients, rating) {
  if (typeof rating !== "number" || Number.isNaN(rating)) {
    console.log("Invalid rating, ignoring findMatch");
    return;
  }

  const me = clients.find((c) => c.socket === ws);
  const myId = me.id;

  const low = rating - 100;
  const high = rating + 100;

  const opponent = await redisClient.eval(matchmakingScript, {
    keys: ["matchmakingQueue", "matchmakingTimes"],
    arguments: [String(low), String(high), myId],
  });

  if (opponent) {
    const opponentClient = clients.find((c) => c.id === opponent);

    if (!opponentClient) {
      const now = Date.now();
      await redisClient.zAdd("matchmakingQueue", {
        score: rating,
        value: myId,
      });
      await redisClient.hSet("matchmakingTimes", myId, now);
      console.log("Opponent vanished, queued self instead");
      return;
    }

    const messageForMe = {
      type: "matchFound",
      opponentId: opponent,
      problem: ques,
      duelId: null,
    };
    const messageForOpponent = {
      type: "matchFound",
      opponentId: myId,
      problem: ques,
      duelId: null,
    };

    const newDuelId = crypto.randomUUID();

    duels[newDuelId] = {
      duelId: newDuelId,
      playerA: myId,
      playerB: opponent,
      status: "waiting",
      winner: null,
    };

    messageForMe.duelId = newDuelId;
    messageForOpponent.duelId = newDuelId;
    me.duelId = newDuelId;
    opponentClient.duelId = newDuelId;

    ws.send(JSON.stringify(messageForMe));
    opponentClient.socket.send(JSON.stringify(messageForOpponent));

    console.log("Match made:", myId, "vs", opponent);
  } else {
    const now = Date.now();

    await redisClient.zAdd("matchmakingQueue", { score: rating, value: myId });
    await redisClient.hSet("matchmakingTimes", myId, now);

    if (sweepTimer === null) {
      sweepTimer = setInterval(() => runSweep(clients), 4000);
    }

    console.log("No opponent found — would wait in queue");
  }
}
