import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import DoodleFace from "@/shared/ui/DoodleFace.jsx";
import ChallengerBanner from "@/shared/ui/ChallengerBanner.jsx";
import { usePrefersReducedMotion } from "@/shared/hooks/usePrefersReducedMotion.js";
import { useRealtime } from "@/shared/realtime/useRealtime.js";
import { useDuel } from "@/features/duel/duelContext.js";
import RivalSlot from "./RivalSlot.jsx";
import s from "./HomeHero.module.css";

const REVEAL_AT_MS = 520; // the rival appears while the banner covers the screen
const BANNER_MS = 1100; // then the duel screen takes over

// What the status line says when a search ends or something goes wrong.
const STATUS = {
  cancelled: "Search cancelled.",
  noMatch: "No rival nearby right now. Try again.",
  inDuel: "Finish your current duel first.",
  busy: "Slow down a little, then try again.",
  lost: "Connection lost. Search again.",
  found: "Rival found. Opening the duel…",
};
const CONNECTION = {
  connecting: "Connecting…",
  reconnecting: "Connection lost. Reconnecting…",
  replaced: "Boip is open in another tab.",
  stopped: "Connection closed after too many messages. Reload the page.",
};

export default function HomeHero({ player }) {
  const reduceMotion = usePrefersReducedMotion();
  const navigate = useNavigate();
  const { status: connection, takeOver } = useRealtime();
  const { phase, note, duel, searchStartedAt, notice, find, cancel } =
    useDuel();
  const [revealedId, setRevealedId] = useState(null); // which duel's rival the banner has uncovered
  const [now, setNow] = useState(() => Date.now());

  // A match: the banner covers the screen, the rival is revealed under it, then the duel opens.
  useEffect(() => {
    if (phase !== "found") return undefined;
    if (reduceMotion) {
      navigate("/duel");
      return undefined;
    }
    const timers = [
      setTimeout(() => setRevealedId(duel.duelId), REVEAL_AT_MS),
      setTimeout(() => navigate("/duel"), BANNER_MS),
    ];
    return () => timers.forEach(clearTimeout);
  }, [phase, duel?.duelId, reduceMotion, navigate]);

  const searching = phase === "searching";
  // The duel screen (editor included) is a separate chunk: start fetching it while we wait for a rival.
  useEffect(() => {
    if (searching) import("@/features/duel/DuelPage.jsx");
  }, [searching]);
  useEffect(() => {
    if (!searching) return undefined;
    const tick = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(tick);
  }, [searching]);

  const found = phase === "found";
  const rival = duel && {
    name: duel.opponent,
    rating: duel.opponentRating,
    provisional: duel.opponentProvisional,
  };
  // With reduced motion there's no banner, so the rival shows straight away.
  const rivalShown = found && (reduceMotion || revealedId === duel.duelId);

  const open = connection === "open";
  let label = "Find a duel";
  let action = find;
  let disabled = !open;
  if (searching) {
    label = "Cancel";
    action = cancel;
    disabled = false;
  } else if (found) {
    label = "In a duel";
    disabled = true;
  } else if (connection === "replaced") {
    label = "Use this tab";
    action = takeOver;
    disabled = false;
  }

  const seconds = searching
    ? Math.max(0, Math.floor((now - searchStartedAt) / 1000))
    : 0;
  const clock = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  const status = !open
    ? CONNECTION[connection]
    : searching
      ? `Finding a rival… ${clock}`
      : (notice ?? STATUS[found ? "found" : note] ?? "");

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
          onClick={action}
          disabled={disabled}
        >
          {label}
        </button>
        <p className={s.status} aria-live="polite">
          {status}
        </p>
      </div>

      <div className={s.slot} data-rival-slot>
        <RivalSlot
          phase={searching ? "searching" : found ? "found" : "idle"}
          rival={rival}
          revealed={rivalShown}
        />
      </div>

      {found && !reduceMotion && (
        <ChallengerBanner text="Rival found" direction={1} />
      )}
    </section>
  );
}
