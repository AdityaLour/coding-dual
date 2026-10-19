import pool from "../db/connection.js";
import { findSessionUser } from "../utils/session.js";
import { clients, sendTo } from "./clients.js";
import {
  hit,
  MSG_LIMIT,
  MSG_WINDOW_MS,
  SUBMIT_GAP_MS,
  MAX_STRIKES,
  HEARTBEAT_MS,
} from "./limits.js";
import {
  handleFindMatch,
  handleCancelMatch,
  leaveQueue,
} from "./matchMaking.js";
import { handleSubmission } from "./submisson.js";
import { duelOf, handleForfeit, playerBack, playerLeft } from "./duels.js";
import { PROVISIONAL_DUELS } from "./rating.js";

function dispatch(client, message) {
  switch (message?.type) {
    case "findMatch":
      return handleFindMatch(client);
    case "cancelMatch":
      return handleCancelMatch(client);
    case "submitCode":
      return handleSubmission(client, message.source_code, message.language_id);
  }
}

export function setUpWebSocket(wss) {
  wss.on("connection", (ws, req, user) => {
    // One live socket per user, newest wins. Registering first makes the old socket stale:
    // its messages are dropped and its close handler leaves the shared state alone.
    const old = clients.get(user.id);
    const client = {
      userId: user.id,
      username: user.username,
      socket: ws,
      buckets: new Map(),
      strikes: 0,
    };
    clients.set(user.id, client);
    old?.socket.close(4001, "Opened in another tab");

    // Messages run one at a time per connection (findMatch then cancelMatch can't interleave),
    // and the old socket's queue entry is removed before the first one runs.
    const log = (label) => (error) => console.error(label, error);
    let chain = (old ? leaveQueue(user.id) : Promise.resolve()).catch(
      log("Queue cleanup failed:"),
    );

    ws.alive = true;
    ws.on("pong", () => (ws.alive = true));
    ws.on("error", log("Socket error:")); // e.g. an oversized message; unhandled, it would crash the process

    ws.on("message", (data) => {
      if (clients.get(user.id) !== client || ws.readyState !== ws.OPEN) return;

      let message;
      try {
        message = JSON.parse(data);
      } catch {
        return; // malformed JSON is ignored
      }

      const tooFast =
        !hit(client.buckets, "any", MSG_LIMIT, MSG_WINDOW_MS) ||
        (message?.type === "submitCode" &&
          !hit(client.buckets, "submit", 1, SUBMIT_GAP_MS));
      if (tooFast) {
        sendTo(user.id, { type: "error", code: "rateLimited" });
        if (++client.strikes >= MAX_STRIKES)
          ws.close(1008, "Too many messages");
        return;
      }

      // Resigning must not wait behind a submission that is still being judged.
      if (message?.type === "forfeit")
        return void Promise.resolve()
          .then(() => handleForfeit(client))
          .catch(log("Forfeit failed:"));
      chain = chain
        .then(() => dispatch(client, message))
        .catch(log("Message failed:"));
    });

    ws.on("close", () => {
      if (clients.get(user.id) !== client) return; // replaced: the new socket owns the state
      clients.delete(user.id);
      leaveQueue(user.id).catch(log("Queue cleanup failed:"));
      // Mid-duel: starts the grace period (see duels.js); the opponent is told.
      const duel = duelOf(user.id);
      if (duel) playerLeft(duel, user.id);
      console.log("Client disconnected. Remaining:", clients.size);
    });

    // Queued behind the cleanup above, so a message sent early still waits for the welcome.
    chain = chain
      .then(async () => {
        let rating = null;
        let provisional = false;
        try {
          const [[row]] = await pool.execute(
            "SELECT rating, duels_played FROM users WHERE id = ?",
            [user.id],
          );
          rating = row.rating;
          provisional = row.duels_played < PROVISIONAL_DUELS;
        } catch (error) {
          log("Rating lookup failed:")(error); // the welcome still goes out, just without a rating
        }
        if (clients.get(user.id) !== client) return; // replaced while we looked it up
        sendTo(user.id, {
          type: "welcome",
          username: user.username,
          rating,
          provisional,
        });
        playerBack(user.id); // reconnecting mid-duel: the duel state follows the welcome
      })
      .catch(log("Welcome failed:"));
  });

  // Every tick: drop sockets that never answered the last ping, then close any whose
  // session has ended (logout, password reset) so an open socket can't outlive its login.
  let checking = false;
  setInterval(async () => {
    for (const ws of wss.clients) {
      if (!ws.alive) ws.terminate();
      else {
        ws.alive = false;
        ws.ping();
      }
    }
    if (checking) return;
    checking = true;
    try {
      for (const ws of wss.clients) {
        if (ws.readyState === ws.OPEN && !(await findSessionUser(ws.token))) {
          ws.close(4002, "Session ended");
        }
      }
    } catch (error) {
      console.error("Session re-check failed:", error); // a database hiccup must not log anyone out
    } finally {
      checking = false;
    }
  }, HEARTBEAT_MS).unref();
}
