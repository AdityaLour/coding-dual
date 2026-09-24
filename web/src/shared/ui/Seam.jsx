import styles from "./Seam.module.css";

/* The diagonal split between "you" and "the opponent".
   top/bottom are the seam's x position (in %) at the top and bottom edges. */
export default function Seam({ top = 72, bottom = 58, className = "" }) {
  return (
    <div className={`${styles.seam} ${className}`} aria-hidden="true">
      <div
        className={styles.oppSide}
        style={{
          clipPath: `polygon(${top}% 0, 100% 0, 100% 100%, ${bottom}% 100%)`,
        }}
      />
      <svg
        className={styles.lines}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <line x1={top} y1="0" x2={bottom} y2="100" className={styles.oppLine} />
        <line
          x1={top + 0.5}
          y1="0"
          x2={bottom + 0.5}
          y2="100"
          className={styles.youLine}
        />
      </svg>
    </div>
  );
}
