import { useEffect, useState } from "react";
import DoodleFace, { FACE_VARIANTS } from "@/shared/ui/DoodleFace.jsx";
import { usePrefersReducedMotion } from "@/shared/hooks/usePrefersReducedMotion.js";
import s from "./RivalSlot.module.css";

const FLICKER_EVERY_MS = 3200;
const FLICKER_STEPS = 12;

// The rival's side of the hero. While idle, doodle faces flicker through it like a
// character-select screen; while searching it becomes a radar; when found it shows the rival.
export default function RivalSlot({ phase, revealed }) {
  const reduceMotion = usePrefersReducedMotion();
  const [flickerFace, setFlickerFace] = useState(null);

  useEffect(() => {
    if (phase !== "idle" || reduceMotion) return undefined;
    let cancelled = false;
    const timeouts = [];
    const run = () => {
      if (document.hidden) return;
      let delay = 0;
      for (let i = 0; i < FLICKER_STEPS; i++) {
        delay += 60 + i * 12;
        timeouts.push(
          setTimeout(
            () => !cancelled && setFlickerFace((i % (FACE_VARIANTS - 1)) + 1),
            delay,
          ),
        );
      }
      timeouts.push(
        setTimeout(() => !cancelled && setFlickerFace(null), delay + 80),
      );
    };
    const every = setInterval(run, FLICKER_EVERY_MS);
    return () => {
      cancelled = true;
      clearInterval(every);
      timeouts.forEach(clearTimeout);
      setFlickerFace(null);
    };
  }, [phase, reduceMotion]);

  const searching = phase === "searching";
  const found = phase === "found" && revealed;

  return (
    <div
      className={`${s.slot} ${searching ? s.searching : ""} ${found ? s.found : ""}`}
      aria-hidden="true"
    >
      <svg className={s.ring} viewBox="0 0 240 240">
        <circle cx="120" cy="120" r="116" />
      </svg>
      <div className={s.inner}>
        {found ? (
          <div className={s.rival}>
            <DoodleFace
              variant={1}
              side="opp"
              size={112}
              background="var(--opp-bg)"
            />
            <span className={s.rivalName}>Sample rival</span>
            <span className={s.rivalRating}>simulated match</span>
          </div>
        ) : searching ? (
          <span className={s.caption}>searching…</span>
        ) : flickerFace !== null ? (
          <DoodleFace
            variant={flickerFace}
            side="opp"
            size={150}
            background="var(--opp-bg)"
          />
        ) : (
          <>
            <span className={s.q}>?</span>
            <span className={s.caption}>your rival</span>
          </>
        )}
      </div>
    </div>
  );
}
