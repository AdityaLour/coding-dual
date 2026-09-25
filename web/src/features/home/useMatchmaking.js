import { useCallback, useEffect, useRef, useState } from "react";

const SIMULATED_WAIT_MS = 3400;

// Matchmaking state for the hero: idle → searching → found.
// The backend isn't connected yet, so the search is simulated in development
// only. A production build says so plainly instead of faking a match.
export function useMatchmaking(onFound) {
  const [phase, setPhase] = useState("idle");
  const [seconds, setSeconds] = useState(0);
  const timers = useRef({ tick: 0, done: 0 });
  const onFoundRef = useRef(onFound);
  useEffect(() => {
    onFoundRef.current = onFound;
  });

  const clear = () => {
    clearInterval(timers.current.tick);
    clearTimeout(timers.current.done);
  };
  useEffect(() => clear, []);

  const start = useCallback(() => {
    if (!import.meta.env.DEV) {
      setPhase("unavailable");
      return;
    }
    clear();
    const startedAt = Date.now();
    setSeconds(0);
    setPhase("searching");
    timers.current.tick = setInterval(
      () => setSeconds(Math.floor((Date.now() - startedAt) / 1000)),
      250,
    );
    timers.current.done = setTimeout(() => {
      clearInterval(timers.current.tick);
      setPhase("found");
      onFoundRef.current?.();
    }, SIMULATED_WAIT_MS);
  }, []);

  const cancel = useCallback(() => {
    clear();
    setPhase("cancelled");
  }, []);

  const reset = useCallback(() => {
    clear();
    setPhase("idle");
  }, []);

  return { phase, seconds, start, cancel, reset };
}
