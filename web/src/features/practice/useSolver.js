import { useCallback, useEffect, useRef, useState } from "react";
import { errorMessage } from "@/shared/api/client.js";
import {
  getHistory,
  getRun,
  getSubmission,
  listProblems,
  runExamples,
  submitCode,
} from "./api.js";
import { nextUnsolved } from "./logic.js";
import { poll, PollTimeout } from "./poll.js";

// One problem's judging: Run and Submit, waiting for the answer, and the person's history on it.
// phase: { kind: "idle" } | { kind: "judging", what } | { kind: "run", ...result }
//      | { kind: "verdict", ...submission } | { kind: "notice", message }
// Every phase carries `n`, a counter, so the screen can replay its entrance for each new one.
export function useSolver(slug, onAccepted) {
  const [phase, setPhase] = useState({ kind: "idle", n: 0 });
  const [history, setHistory] = useState(null); // null until the first answer
  const [next, setNext] = useState(null); // the next unsolved problem, once this one is accepted
  const busy = useRef(false);
  const serial = useRef(0);
  const stop = useRef(new AbortController());
  const accepted = useRef(onAccepted); // the newest callback, without making `start` change with it
  useEffect(() => {
    accepted.current = onAccepted;
  });

  useEffect(() => {
    const controller = new AbortController();
    stop.current = controller;
    return () => controller.abort();
  }, []);

  const put = useCallback((phase) => setPhase({ ...phase, n: ++serial.current }), []);
  const refreshHistory = useCallback(
    () => getHistory(slug).then(setHistory, () => setHistory((old) => old ?? [])),
    [slug],
  );
  useEffect(() => {
    refreshHistory();
  }, [refreshHistory]);

  const findNext = useCallback(
    () => listProblems().then((list) => setNext(nextUnsolved(list, slug)), () => {}),
    [slug],
  );

  const start = useCallback(
    async (what, languageId, source) => {
      if (busy.current) return;
      busy.current = true;
      const { signal } = stop.current;
      put({ kind: "judging", what });
      try {
        if (what === "run") {
          const { id } = await runExamples(slug, languageId, source);
          const done = await poll(() => getRun(id), (run) => run.status === "done", { signal });
          put({ kind: "run", ...done });
        } else {
          const { id } = await submitCode(slug, languageId, source);
          const done = await poll(() => getSubmission(id), (row) => row.done, { signal });
          const { source: _kept, ...verdict } = done; // the code itself stays out of the screen state
          put({ kind: "verdict", ...verdict });
          refreshHistory();
          if (verdict.verdict === "Accepted") {
            findNext();
            accepted.current?.();
          }
        }
      } catch (error) {
        if (error?.name === "AbortError") return;
        put({
          kind: "notice",
          message:
            error instanceof PollTimeout
              ? "Judging is taking longer than usual. Check History in a moment."
              : errorMessage(error),
        });
        if (what === "submit") refreshHistory();
      } finally {
        busy.current = false;
      }
    },
    [slug, put, refreshHistory, findNext],
  );

  return {
    phase,
    history,
    next,
    judging: phase.kind === "judging",
    run: (languageId, source) => start("run", languageId, source),
    submit: (languageId, source) => start("submit", languageId, source),
    loadCode: (id) => getSubmission(id),
  };
}
