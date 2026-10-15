import { useEffect, useMemo, useRef, useState } from "react";
import { Outlet } from "react-router";
import { API_URL, ApiError, api } from "@/shared/api/client.js";
import { useAuth } from "@/shared/auth/useAuth.js";
import { RealtimeContext } from "./useRealtime.js";

const SOCKET_URL = (API_URL || window.location.origin).replace(/^http/, "ws");
const RETRY_MIN_MS = 1000;
const RETRY_MAX_MS = 30_000;

// Close codes the server sends on purpose (backend/websocket). None of them is retried.
const REPLACED = 4001; // the account opened Boip in another tab
const SESSION_ENDED = 4002; // logged out or password reset elsewhere
const TOO_MANY = 1008; // too many messages

// The app's single WebSocket, shared through context (the server allows one per user).
// Sits around the pages that need it, so it connects on arrival and closes on leaving.
// status: "connecting" | "open" | "reconnecting" | "replaced" | "stopped"
export default function RealtimeProvider() {
  const { signedOut } = useAuth();
  const [status, setStatus] = useState("connecting");
  const socket = useRef(null);
  const listeners = useRef(new Set());
  const connectNow = useRef(() => {});
  const signedOutRef = useRef(signedOut);
  useEffect(() => {
    signedOutRef.current = signedOut;
  });

  useEffect(() => {
    let timer;
    let failures = 0;
    let closed = false; // this effect was cleaned up: ignore anything still in flight

    async function onDrop(code) {
      if (closed) return;
      if (code === REPLACED) return setStatus("replaced");
      if (code === TOO_MANY) return setStatus("stopped");
      if (code === SESSION_ENDED) return signedOutRef.current();

      setStatus("reconnecting");
      // A refused handshake looks like any other drop to a browser, so ask the API
      // whether the login is gone. Only a clear 401 ends it; anything else is retried.
      try {
        await api("/session");
      } catch (error) {
        if (!closed && error instanceof ApiError && error.status === 401) {
          return signedOutRef.current();
        }
      }
      if (closed) return;
      const delay = Math.min(RETRY_MIN_MS * 2 ** failures++, RETRY_MAX_MS);
      timer = setTimeout(connect, delay * (0.75 + Math.random() * 0.5));
    }

    function connect() {
      const ws = new WebSocket(SOCKET_URL);
      socket.current = ws;
      ws.onmessage = (event) => {
        let message;
        try {
          message = JSON.parse(event.data);
        } catch {
          return;
        }
        if (message.type === "welcome") {
          failures = 0;
          setStatus("open");
        }
        listeners.current.forEach((listener) => listener(message));
      };
      ws.onclose = (event) => onDrop(event.code);
    }

    connectNow.current = () => {
      clearTimeout(timer);
      setStatus("connecting");
      connect();
    };
    // Deferred a tick so StrictMode's throwaway first mount never opens a socket.
    timer = setTimeout(connect, 0);

    return () => {
      closed = true;
      clearTimeout(timer);
      const ws = socket.current;
      if (ws) {
        ws.onmessage = ws.onclose = null; // a deliberate close is not a drop
        ws.close();
      }
    };
  }, []);

  const value = useMemo(
    () => ({
      status,
      // Returns false when the socket isn't open, so callers can tell the message went nowhere.
      send: (message) => {
        const ws = socket.current;
        if (ws?.readyState !== WebSocket.OPEN) return false;
        ws.send(JSON.stringify(message));
        return true;
      },
      subscribe: (listener) => {
        listeners.current.add(listener);
        return () => listeners.current.delete(listener);
      },
      // After "replaced": use this tab instead (the other one gets closed by the server).
      takeOver: () => connectNow.current(),
    }),
    [status],
  );

  return (
    <RealtimeContext value={value}>
      <Outlet />
    </RealtimeContext>
  );
}
