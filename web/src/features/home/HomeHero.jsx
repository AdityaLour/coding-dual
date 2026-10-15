import { useEffect, useRef, useState } from "react";
import DoodleFace from "@/shared/ui/DoodleFace.jsx";
import ChallengerBanner from "@/shared/ui/ChallengerBanner.jsx";
import { usePrefersReducedMotion } from "@/shared/hooks/usePrefersReducedMotion.js";
import { useRealtime } from "@/shared/realtime/useRealtime.js";
import RivalSlot from "./RivalSlot.jsx";
import { useMatchmaking } from "./useMatchmaking.js";
import s from "./HomeHero.module.css";

const REVEAL_AT_MS = 520; // the rival appears while the banner covers the screen
const BANNER_MS = 1100;

// What the status line says for each phase and for each connection problem.
const STATUS = {
  cancelled: "Search cancelled.",
  noMatch: "No rival nearby right now. Try again.",
  inDuel: "Finish your current duel first.",
  busy: "Slow down a little, then try again.",
  lost: "Connection lost. Search again.",
  found: "Rival found. The duel screen comes next.",
};
const CONNECTION = {
  connecting: "Connecting…",
  reconnecting: "Connection lost. Reconnecting…",
  replaced: "Boip is open in another tab.",
  stopped: "Connection closed after too many messages. Reload the page.",
};

export default function HomeHero({ player }) {
  const reduceMotion = usePrefersReducedMotion();
  const [banner, setBanner] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const timers = useRef([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // Runs the moment the server reports a match.
  function handleFound() {
    clearTimers(); // a banner from an earlier match must not overlap this one
    if (reduceMotion) return;
    setBanner(true);
    timers.current.push(
      setTimeout(() => setRevealed(true), REVEAL_AT_MS),
      setTimeout(() => setBanner(false), BANNER_MS),
    );
  }
  const { status: connection, takeOver } = useRealtime();
  const { phase, seconds, rival, start, cancel } = useMatchmaking(handleFound);
  // With reduced motion there's no banner, so the rival shows straight away.
  const rivalShown = phase === "found" && (reduceMotion || revealed);

  function clearTimers() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setBanner(false);
    setRevealed(false);
  }

  const searching = phase === "searching";
  const open = connection === "open";
  let label = "Find a duel";
  let action = start;
  let disabled = !open;
  if (searching) {
    label = "Cancel";
    action = cancel;
    disabled = false;
  } else if (phase === "found") {
    label = "In a duel";
    disabled = true;
  } else if (connection === "replaced") {
    label = "Use this tab";
    action = takeOver;
    disabled = false;
  }

  function handleClick() {
    if (!searching) clearTimers();
    action();
  }

  const clock = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  const status = !open
    ? CONNECTION[connection]
    : searching
      ? `Finding a rival… ${clock}`
      : (STATUS[phase] ?? "");

  return (
    <section className={s.hero} aria-labelledby="home-title">
      <div className={s.oppSide} aria-hidden="true" />
      <div className={s.seamYou} aria-hidden="true" />
      <div className={s.seamOpp} aria-hidden="true" />

      <div className={s.copy}>
        <div className={s.me}>
          <DoodleFace size={84} className={s.meFace} />
          <div className={s.meText}>
            <div className={s.name}>{player.name}</div>
            <div className={s.rank}>{player.rank}</div>
          </div>
        </div>
        <h1 id="home-title" className={s.title}>
          Ready for a rival?
        </h1>
        <p className={s.lede}>
          Get matched with a player near your rating. Same problem, hidden code,
          first correct answer wins.
        </p>
        <button
          type="button"
          className={`${s.find} ${searching ? s.secondary : ""}`}
          onClick={handleClick}
          disabled={disabled}
        >
          {label}
        </button>
        <p className={s.status} aria-live="polite">
          {status}
        </p>
      </div>

      <div className={s.slot} data-rival-slot>
        <RivalSlot phase={phase} rival={rival} revealed={rivalShown} />
      </div>

      {banner && <ChallengerBanner text="Rival found" direction={1} />}
    </section>
  );
}
