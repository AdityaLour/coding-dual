import { memo, useEffect, useState } from "react";
import { usePrefersReducedMotion } from "@/shared/hooks/usePrefersReducedMotion.js";
import { CYCLE, TICK_MS, demoFrame, segmentList } from "./demo.js";
import styles from "./DuelBand.module.css";

// Plays in the loop only while the page is visible; reduced motion gets the finished frame.
function useDemoTick() {
  const calm = usePrefersReducedMotion();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (calm) return undefined;
    let timer = 0;
    const start = () => {
      if (!timer) timer = setInterval(() => setTick((t) => (t + 1) % CYCLE), TICK_MS);
    };
    const stop = () => {
      clearInterval(timer);
      timer = 0;
    };
    const onVisibility = () => (document.hidden ? stop() : start());
    start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [calm]);

  return calm ? 100 : tick;
}

function Segments({ lit }) {
  return (
    <div className={styles.segs}>
      {segmentList(lit).map((s) => (
        <i key={s.id} className={s.on ? `${styles.seg} ${styles.on}` : styles.seg} />
      ))}
    </div>
  );
}

function DuelBand() {
  const f = demoFrame(useDemoTick());

  return (
    <div
      className={styles.band}
      role="img"
      aria-label="A sped-up duel. Two players race on the same clock. The player on the left finishes first."
    >
      <div className={`${styles.panel} ${styles.you} ${f.solved ? styles.win : ""}`}>
        <div className={styles.who}>
          <b>you</b>
          <span className={styles.chip}>Python</span>
        </div>
        <div className={styles.name}>You</div>
        <Segments lit={f.youSegments} />
        <div className={styles.status}>
          {f.youWriting && <span className={styles.blink}>writing</span>}
          {f.youChecking && <span className={styles.blink}>checking</span>}
          {f.solved && <span className={styles.ok}>Solved</span>}
          {f.result && <span className={`${styles.delta} ${styles.gain}`}>+18</span>}
        </div>
      </div>

      <i className={`${styles.seam} ${styles.seamYou}`} />
      <i className={`${styles.seam} ${styles.seamRival}`} />
      <div className={styles.clock}>{f.clock}</div>

      <div className={`${styles.panel} ${styles.rival} ${f.solved ? styles.lose : ""}`}>
        <div className={styles.who}>
          <b>rival</b>
          <span className={styles.chip}>C++</span>
        </div>
        <div className={styles.name}>Rival</div>
        <Segments lit={f.rivalSegments} />
        <div className={styles.status}>
          {f.rivalWriting && <span className={styles.blink}>writing</span>}
          {f.solved && <span>duel over</span>}
          {f.result && <span className={`${styles.delta} ${styles.loss}`}>&#8722;18</span>}
        </div>
      </div>
    </div>
  );
}

export default memo(DuelBand);
