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

            await redisClient.zRem("matchmakingQueue", opponent);
            await redisClient.hDel("matchmakingTimes", opponent);

            const messageForMe = {
              type: "matchFound",
              opponentId: opponent,
            };

            const messageForOpponent = { type: "matchFound", opponentId: myId };

            ws.send(JSON.stringify(messageForMe));
            opponentClient.socket.send(JSON.stringify(messageForOpponent));

            console.log("Match made:", myId, "vs", opponent);
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

    ws.on("close", async function () {
      const index = clients.findIndex((c) => c.socket === ws);

      if (index !== -1) {
        const id = clients[index].id;

        await redisClient.zRem("matchmakingQueue", id);
        await redisClient.hDel("matchmakingTimes", id);
        clients.splice(index, 1);
      }
      console.log("Client disconnected. Remaining:", clients.length);
    });
  });
}
