import fs from "fs";
import redisClient from "../redis/connection.js";

const matchmakingScript = fs.readFileSync("redis/matchmaking.lua", "utf8");

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

    const messageForMe = { type: "matchFound", opponentId: opponent };
    const messageForOpponent = { type: "matchFound", opponentId: myId };

    ws.send(JSON.stringify(messageForMe));
    opponentClient.socket.send(JSON.stringify(messageForOpponent));

    console.log("Match made:", myId, "vs", opponent);
  } else {
    const now = Date.now();
    await redisClient.zAdd("matchmakingQueue", { score: rating, value: myId });
    await redisClient.hSet("matchmakingTimes", myId, now);
    console.log("No opponent found — would wait in queue");
  }
}
