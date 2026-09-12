import crypto from "crypto";

export function setUpWebSocket(wss) {
  const clients = [];

  wss.on("connection", function (ws) {
    const client = { id: crypto.randomUUID(), socket: ws };
    clients.push(client);
    const welcome = { type: "welcome", id: client.id };
    ws.send(JSON.stringify(welcome));

    ws.on("message", function (data) {
      try {
        const parsedData = JSON.parse(data);

        if (parsedData.type === "ping") {
          ws.send(JSON.stringify({ type: "pong" }));
        }
      } catch (error) {
        console.error("Invalid message:", error);
        return;
      }
    });
  });
}
