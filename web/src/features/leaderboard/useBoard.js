import { useCallback, useEffect, useRef, useState } from "react";
import { errorMessage } from "@/shared/api/client.js";
import { getBoard } from "./api.js";

const REFRESH_AFTER_MS = 60_000;

// Loads the boards, and loads them again when the tab comes back after a minute away.
// A failed refresh keeps what is on screen and says so; only a first load can fail outright.
export function useBoard() {
  const [state, setState] = useState({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const loadedAt = useRef(0);

  useEffect(() => {
    let current = true;
    getBoard().then(
      (data) => {
        if (!current) return;
        loadedAt.current = Date.now();
        // The server's clock, so the weekly countdown is right even if this device's clock is off.
        setState({ status: "ready", data, skew: data.now - Date.now(), stale: false });
      },
      (error) => {
        if (!current) return;
        setState((previous) =>
          previous.status === "ready"
            ? { ...previous, stale: true }
            : { status: "error", message: errorMessage(error) },
        );
      },
    );
    return () => {
      current = false;
    };
  }, [attempt]);

  useEffect(() => {
    const back = () => {
      if (document.visibilityState === "visible" && Date.now() - loadedAt.current > REFRESH_AFTER_MS) {
        setAttempt((n) => n + 1);
      }
    };
    document.addEventListener("visibilitychange", back);
    return () => document.removeEventListener("visibilitychange", back);
  }, []);

  const retry = useCallback(() => {
    setState((previous) => (previous.status === "ready" ? previous : { status: "loading" }));
    setAttempt((n) => n + 1);
  }, []);

  return { state, retry };
}
