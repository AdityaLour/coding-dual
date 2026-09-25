import { useEffect, useRef, useState } from "react";
import DoodleFace from "@/shared/ui/DoodleFace.jsx";
import ChallengerBanner from "@/shared/ui/ChallengerBanner.jsx";
import { usePrefersReducedMotion } from "@/shared/hooks/usePrefersReducedMotion.js";
import RivalSlot from "./RivalSlot.jsx";
import { useMatchmaking } from "./useMatchmaking.js";
import s from "./HomeHero.module.css";

const REVEAL_AT_MS = 520; // the rival appears while the banner covers the screen
const BANNER_MS = 1100;

const STATUS = {
  idle: "",
  cancelled: "Search cancelled.",
  found: "Sample rival found. The duel screen comes next.",
  unavailable: "Matchmaking isn't connected yet.",
};

export default function HomeHero({ player }) {
  const reduceMotion = usePrefersReducedMotion();
  const [banner, setBanner] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const timers = useRef([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // Runs the moment a match is found (from the matchmaking timer, not an effect).
  function handleFound() {
    if (reduceMotion) return;
    setBanner(true);
    timers.current.push(
      setTimeout(() => setRevealed(true), REVEAL_AT_MS),
      setTimeout(() => setBanner(false), BANNER_MS),
    );
  }
  const { phase, seconds, start, cancel, reset } = useMatchmaking(handleFound);
  // With reduced motion there's no banner, so the rival shows straight away.
  const rivalShown = phase === "found" && (reduceMotion || revealed);

  function clearTimers() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setBanner(false);
    setRevealed(false);
  }

  function handleClick() {
    if (phase === "searching") return cancel();
    clearTimers(); // a banner from the previous match must not fire later
    if (phase === "found") return reset();
    start();
  }

  const searching = phase === "searching";
  const label = searching
    ? "Cancel"
    : phase === "found"
      ? "Search again"
      : "Find a duel";
  const status = searching
    ? `Finding a rival… 0:${String(seconds).padStart(2, "0")}`
    : STATUS[phase];

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
        >
          {label}
        </button>
        <p className={s.status} aria-live="polite">
          {status}
        </p>
      </div>

      <div className={s.slot} data-rival-slot>
        <RivalSlot phase={phase} revealed={rivalShown} />
      </div>

      {banner && <ChallengerBanner text="Rival found" direction={1} />}
    </section>
  );
}
