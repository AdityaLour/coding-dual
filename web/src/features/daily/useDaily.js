import { useCallback, useEffect, useState } from "react";
import { getDaily } from "./api.js";
import { refreshDelay, skewOf } from "./time.js";

// Today's challenge. status: "loading" | "ready" | "error". Once it has loaded it stays "ready"
// (a failed refresh keeps the last answer), so a page never flashes empty while it updates.
// `reload` asks again, for example after a solve. The page also asks by itself once the day ends.
export function useDaily() {
  const [state, setState] = useState({ status: "loading", daily: null, skew: 0, error: null });

  const reload = useCallback(
    () =>
      getDaily().then(
        (daily) => setState({ status: "ready", daily, skew: skewOf(daily.now, Date.now()), error: null }),
        (error) => setState((old) => (old.status === "ready" ? old : { status: "error", daily: null, skew: 0, error })),
      ),
    [],
  );

  useEffect(() => {
    reload();
  }, [reload]);

  // When the day ends, the problem and the week change: ask again, a moment later.
  useEffect(() => {
    if (!state.daily) return undefined;
    const serverNow = Date.now() + state.skew;
    const timer = setTimeout(reload, refreshDelay(state.daily.resetsAt, serverNow));
    return () => clearTimeout(timer);
  }, [state, reload]);

  const retry = () => {
    setState({ status: "loading", daily: null, skew: 0, error: null });
    reload();
  };
  return { ...state, reload, retry };
}
