import crypto from "crypto";
import redisClient from "../redis/connection.js";

export function setUpWebSocket(wss) {
  const clients = [];

  wss.on("connection", function (ws) {
    const client = { id: crypto.randomUUID(), socket: ws };
    clients.push(client);
    const welcome = { type: "welcome", id: client.id };
    ws.send(JSON.stringify(welcome));

    ws.on("message", async function (data) {
      try {
        const parsedData = JSON.parse(data);

        if (parsedData.type === "findMatch") {
          const rating = parsedData.rating;

          if (typeof rating !== "number" || Number.isNaN(rating)) {
            console.log("Invalid rating, ignoring findMatch");
            return;
          }

          const me = clients.find((c) => c.socket === ws);

          const myId = me.id;
          const low = rating - 100;
          const high = rating + 100;

          const match = await redisClient.zRangeByScore(
            "matchmakingQueue",
            low,
            high,
          );

          const opponent = match.find((id) => id !== myId);

          if (opponent) {
            console.log("Found opponent", opponent);
          } else {
            const now = Date.now();
            await redisClient.zAdd("matchmakingQueue", {
              score: rating,
              value: myId,
            });
            await redisClient.hSet("matchmakingTimes", myId, now);
            console.log("No opponent found — would wait in queue");
          }
        }
      } catch (error) {
        console.error("Invalid message:", error);
        return;
      }
    });

    ws.on("close", function () {
      const index = clients.findIndex((c) => c.socket === ws);
      if (index !== -1) {
        clients.splice(index, 1);
      }
      console.log("Client disconnected. Remaining:", clients.length);
    });
  });
}
