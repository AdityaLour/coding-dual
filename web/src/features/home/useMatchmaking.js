import { useCallback, useEffect, useRef, useState } from "react";
import { useRealtime } from "@/shared/realtime/useRealtime.js";

const GIVE_UP_MS = 30_000;
const GONE = ["replaced", "stopped"]; // connection states that won't come back by themselves

// Matchmaking for the hero, driven by the server.
// phase: idle | searching | found | cancelled | noMatch | inDuel | busy | lost
export function useMatchmaking(onFound) {
  const { status, send, subscribe } = useRealtime();
  const [phase, setPhase] = useState("idle");
  const [rival, setRival] = useState(null);
  const [clock, setClock] = useState({ startedAt: 0, now: 0 });
  const phaseRef = useRef("idle"); // lets the message listener see the current phase
  const onFoundRef = useRef(onFound);
  useEffect(() => {
    onFoundRef.current = onFound;
  });

  const change = useCallback((next) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  useEffect(
    () =>
      subscribe((message) => {
        switch (message.type) {
          case "welcome": // (re)connected: a search that was running died with the old socket
            if (phaseRef.current === "searching") send({ type: "findMatch" });
            break;
          case "matchFound":
            setRival({ name: message.opponent, problem: message.problem });
            change("found");
            onFoundRef.current?.();
            break;
          case "noMatch":
            change("noMatch");
            break;
          case "error":
            if (message.code === "inDuel") change("inDuel");
            else if (message.code === "rateLimited") change("busy");
            // alreadyQueued: the server has us queued, which is what we wanted
            break;
          case "gameOver": // the duel ended, so the next search is allowed
          case "result":
            if (message.type === "gameOver" || message.correct) {
              setRival(null);
              change("idle");
            }
            break;
        }
      }),
    [subscribe, send, change],
  );

  // Searching without a connection: wait a while for it to come back, then stop.
  useEffect(() => {
    if (phase !== "searching" || status === "open") return undefined;
    const wait = GONE.includes(status) ? 0 : GIVE_UP_MS;
    const timer = setTimeout(() => change("lost"), wait);
    return () => clearTimeout(timer);
  }, [phase, status, change]);

  // The search clock; stays on the original start time across a reconnect.
  useEffect(() => {
    if (phase !== "searching") return undefined;
    const tick = setInterval(
      () => setClock((c) => ({ ...c, now: Date.now() })),
      250,
    );
    return () => clearInterval(tick);
  }, [phase]);

  const start = useCallback(() => {
    if (!send({ type: "findMatch" })) return;
    const now = Date.now();
    setClock({ startedAt: now, now });
    change("searching");
  }, [send, change]);

  const cancel = useCallback(() => {
    send({ type: "cancelMatch" });
    change("cancelled");
  }, [send, change]);

  const seconds = Math.max(0, Math.floor((clock.now - clock.startedAt) / 1000));
  return { phase, seconds, rival, start, cancel };
}
