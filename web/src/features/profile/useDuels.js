import { useCallback, useEffect, useState } from "react";
import { errorMessage } from "@/shared/api/client.js";
import { getDuels } from "./api.js";

// One filter's list of duels, a page at a time. Changing the filter starts again from the newest.
export function useDuels(filter) {
  const [box, setBox] = useState({ filter, rows: [], next: null, phase: "loading", message: "" });
  const [attempt, setAttempt] = useState(0);
  const [more, setMore] = useState({ busy: false, message: "" });

  useEffect(() => {
    let current = true;
    getDuels({ filter }).then(
      (page) => current && setBox({ filter, rows: page.duels, next: page.next, phase: "ready", message: "" }),
      (error) =>
        current && setBox({ filter, rows: [], next: null, phase: "error", message: errorMessage(error) }),
    );
    return () => {
      current = false;
    };
  }, [filter, attempt]);

  const stale = box.filter !== filter; // the filter just changed and its first page has not arrived
  const next = stale ? null : box.next;

  const loadMore = useCallback(() => {
    if (!next || more.busy) return;
    setMore({ busy: true, message: "" });
    getDuels({ filter, cursor: next }).then(
      (page) => {
        setBox((previous) => {
          if (previous.filter !== filter) return previous;
          const seen = new Set(previous.rows.map((d) => d.id));
          return { ...previous, rows: [...previous.rows, ...page.duels.filter((d) => !seen.has(d.id))], next: page.next };
        });
        setMore({ busy: false, message: "" });
      },
      (error) => setMore({ busy: false, message: errorMessage(error) }),
    );
  }, [filter, next, more.busy]);

  const retry = useCallback(() => {
    setBox((previous) => ({ ...previous, filter, phase: "loading" }));
    setAttempt((n) => n + 1);
  }, [filter]);

  return {
    phase: stale ? "loading" : box.phase,
    message: box.message,
    rows: stale ? [] : box.rows,
    hasMore: Boolean(next),
    loadingMore: more.busy,
    moreMessage: more.message,
    loadMore,
    retry,
  };
}
