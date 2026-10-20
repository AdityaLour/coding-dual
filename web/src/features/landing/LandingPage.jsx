import { useCallback, useRef } from "react";
import { useMediaQuery } from "@/shared/hooks/useMediaQuery.js";
import { usePrefersReducedMotion } from "@/shared/hooks/usePrefersReducedMotion.js";
import Act1 from "./Act1.jsx";
import Practice from "./Practice.jsx";
import Rating from "./Rating.jsx";
import Finale from "./Finale.jsx";
import { useScrollScene } from "./useScrollScene.js";
import styles from "./LandingPage.module.css";

export default function LandingPage() {
  const calm = usePrefersReducedMotion();
  // Too small to pin a whole screen: phones, short landscape windows.
  const compact = useMediaQuery("(max-width: 900px), (max-height: 559px)");
  const flat = calm || compact;

  const root = useRef(null);
  const act = useRef(null);
  const stage = useRef(null);
  const prac = useRef(null);
  const rate = useRef(null);
  const num = useRef(null);
  const fin = useRef(null);
  // The rating number is written straight into the page, so scrolling never re-renders React.
  const onRating = useCallback((value) => {
    if (num.current) num.current.textContent = String(value);
  }, []);
  useScrollScene({ root, act, stage, prac, rate, fin, onRating }, { flat, calm });

  return (
    <div ref={root} className={styles.page} data-flat={flat}>
      <title>Boip: coding duels</title>
      <i className={`${styles.glow} ${styles.glowOne}`} aria-hidden="true" />
      <i className={`${styles.glow} ${styles.glowTwo}`} aria-hidden="true" />

      <main>
        <Act1 actRef={act} stageRef={stage} />
        <Practice sectionRef={prac} />
        <Rating sectionRef={rate} numRef={num} />
        <Finale sectionRef={fin} />
      </main>
    </div>
  );
}
