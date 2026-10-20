import styles from "./Rating.module.css";

const POINTS = "M10 190 L70 160 L130 172 L190 128 L250 138 L310 96 L370 108 L430 64 L490 78 L550 34";

export default function Rating({ sectionRef, numRef }) {
  return (
    <section ref={sectionRef} className={styles.section}>
      <div className={styles.wrap}>
        <div className={styles.grid}>
          <div>
            <h2 className={styles.title}>
              A rating that{" "}
              <br />
              moves for{" "}
              <br />
              a reason.
            </h2>
            <p className={styles.lede}>Beat a stronger rival and you gain more.</p>
            <div className={styles.big} role="img" aria-label="Example rating rising from 1200 to 1218">
              <span ref={numRef} aria-hidden="true">
                1218
              </span>
            </div>
          </div>
          <div className={styles.chart}>
            <span className={styles.example}>example</span>
            <svg viewBox="0 0 560 230" role="img" aria-label="Example rating line rising with a few dips">
              <path d="M0 50H560M0 115H560M0 180H560" stroke="var(--border)" strokeWidth="1" />
              <path
                className={styles.draw}
                pathLength="1"
                d={POINTS}
                fill="none"
                stroke="var(--you)"
                strokeWidth="3"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              <circle className={styles.dot} cx="550" cy="34" r="6" fill="var(--you)" />
            </svg>
          </div>
        </div>

        <ul className={styles.three}>
          <li>Matched near your rating.</li>
          <li>A new leaderboard every week.</li>
          <li>Practice any time.</li>
        </ul>
      </div>
    </section>
  );
}
