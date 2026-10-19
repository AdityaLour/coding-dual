import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import { Outlet } from "react-router";
import { useRealtime } from "@/shared/realtime/useRealtime.js";
import { DuelContext } from "./duelContext.js";
import { initialState, reducer } from "./duelReducer.js";
import { MAX_MESSAGE_BYTES, MAX_SOURCE_BYTES } from "./limits.js";

const GIVE_UP_MS = 30_000; // a search with no connection waits this long, then stops
const RESUME_WAIT_MS = 4000; // after a reconnect mid-duel, the server should have put us back by now
const JUDGE_GUARD_MS = 60_000; // a verdict lost in a reconnect must not leave "Judging" stuck
const GONE = ["replaced", "stopped"]; // connection states that won't come back by themselves

// Runs `run` after `ms` while `active`; the returned cleanup cancels it (for use as an effect body).
const after = (active, ms, run) => {
  if (!active) return undefined;
  const timer = setTimeout(run, ms);
  return () => clearTimeout(timer);
};

// Everything the client knows about matchmaking and the current duel. Sits inside RealtimeProvider,
// around /home and /duel, so the state survives moving between them.
export default function DuelProvider() {
  const { status, send, subscribe } = useRealtime();
  const [state, dispatch] = useReducer(reducer, initialState);
  const latest = useRef(state); // for handlers that must see the current state
  useEffect(() => {
    latest.current = state;
  });

  useEffect(
    () =>
      subscribe((message) => {
        dispatch({ ...message, at: Date.now() });
        // Reconnected: a search that was running died with the old socket.
        if (message.type === "welcome" && latest.current.phase === "searching")
          send({ type: "findMatch" });
      }),
    [subscribe, send],
  );

  // Each guard is a timer that only runs while its condition holds.
  const lonely = state.phase === "searching" && status !== "open";
  useEffect(
    () =>
      after(lonely, GONE.includes(status) ? 0 : GIVE_UP_MS, () =>
        dispatch({ type: "ui/lost" }),
      ),
    [lonely, status],
  );
  useEffect(
    () =>
      after(state.syncing, RESUME_WAIT_MS, () =>
        dispatch({ type: "ui/desync" }),
      ),
    [state.syncing],
  );
  useEffect(
    () =>
      after(state.judging, JUDGE_GUARD_MS, () =>
        dispatch({ type: "ui/judgeTimeout" }),
      ),
    [state.judging],
  );

  const find = useCallback(() => {
    if (send({ type: "findMatch" }))
      dispatch({ type: "ui/search", at: Date.now() });
  }, [send]);

  const cancel = useCallback(() => {
    send({ type: "cancelMatch" });
    dispatch({ type: "ui/cancel" });
  }, [send]);

  // -> true when the code went out. Otherwise a notice says why not.
  const submit = useCallback(
    (source, languageId) => {
      const { phase, judging, duel } = latest.current;
      if (phase !== "duel" || judging || duel.attemptsLeft <= 0) return false;
      const refuse = (text) => {
        dispatch({ type: "ui/notice", text });
        return false;
      };
      if (!source.trim()) return refuse("Write some code first.");
      const bytes = (text) => new TextEncoder().encode(text).length;
      const message = {
        type: "submitCode",
        source_code: source,
        language_id: languageId,
      };
      // Escaping (quotes, newlines) makes the message longer than the code. An oversized message
      // would close the socket, which counts as a disconnect, so it is refused here instead.
      if (
        bytes(source) > MAX_SOURCE_BYTES ||
        bytes(JSON.stringify(message)) > MAX_MESSAGE_BYTES
      ) {
        return refuse("Your code is over the 20 KB limit.");
      }
      if (!send(message))
        return refuse("Not connected. Try again in a moment.");
      dispatch({ type: "ui/submitted" });
      return true;
    },
    [send],
  );

  // Gives up the duel (a loss). The server answers with the duelEnd. -> true when the request went out.
  const forfeit = useCallback(() => {
    if (!send({ type: "forfeit" })) {
      dispatch({
        type: "ui/notice",
        text: "Not connected. Try again in a moment.",
      });
      return false;
    }
    dispatch({ type: "ui/resigned" });
    return true;
  }, [send]);

  const begin = useCallback(() => dispatch({ type: "ui/begin" }), []);
  const leave = useCallback(() => dispatch({ type: "ui/leave" }), []);

  const value = useMemo(
    () => ({ ...state, find, cancel, begin, submit, forfeit, leave }),
    [state, find, cancel, begin, submit, forfeit, leave],
  );
  return (
    <DuelContext value={value}>
      <Outlet />
    </DuelContext>
  );
}
