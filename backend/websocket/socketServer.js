import crypto from "crypto";
import redisClient from "../redis/connection.js";
import { handleFindMatch } from "./matchMaking.js";
import { handleSubmission } from "./submisson.js";

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
          await handleFindMatch(ws, clients, parsedData.rating);
        }

        if (parsedData.type === "submitCode") {
          await handleSubmission(
            ws,
            parsedData.source_code,
            parsedData.language_id,
          );
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
