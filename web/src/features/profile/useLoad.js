import { useCallback, useEffect, useState } from "react";
import { ApiError, errorMessage } from "@/shared/api/client.js";

// Loads once `enabled` first turns true and then keeps the answer, so switching tabs back and forth
// never asks the server twice. `load` must be a stable function (the ones in api.js are).
// state: { status: "idle" | "loading" | "ready" | "error", data, message, code }
export function useLoad(load, enabled = true) {
  const [wanted, setWanted] = useState(enabled);
  if (enabled && !wanted) setWanted(true);
  const [state, setState] = useState({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!wanted) return undefined;
    let current = true;
    load().then(
      (data) => current && setState({ status: "ready", data }),
      (error) =>
        current &&
        setState({
          status: "error",
          message: errorMessage(error),
          code: error instanceof ApiError ? error.status : 0,
        }),
    );
    return () => {
      current = false;
    };
  }, [load, wanted, attempt]);

  const retry = useCallback(() => {
    setState({ status: "loading" });
    setAttempt((n) => n + 1);
  }, []);

  return { state: wanted ? state : { status: "idle" }, retry };
}
