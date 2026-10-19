import { useEffect, useState } from "react";
import { formatClock } from "./format.js";
import s from "./ArenaHeader.module.css";

const LAST_MINUTE = 60;
const WARNINGS = { 60: "One minute left", 10: "Ten seconds left" };

const secondsLeft = (endsAt, offset) =>
  Math.max(0, Math.ceil((endsAt - (Date.now() + offset)) / 1000));

// The countdown and its bar. It runs off the server's deadline (offset = server clock minus ours),
// and keeps its own state, so the ticking never re-renders the rest of the screen.
export default function Clock({ endsAt, offset, totalMs, className = "" }) {
  const [left, setLeft] = useState(() => secondsLeft(endsAt, offset));

  useEffect(() => {
    const tick = () => setLeft(secondsLeft(endsAt, offset)); // the same second again changes nothing
    tick();
    const timer = setInterval(tick, 200);
    return () => clearInterval(timer);
  }, [endsAt, offset]);

  const fraction = Math.min(1, left / (totalMs / 1000));
  return (
    <div
      className={`${s.clock} ${className}`}
      role="timer"
      aria-label="Time left"
    >
      <span
        className={`${s.time} ${left <= LAST_MINUTE && left > 0 ? s.tick : ""}`}
      >
        {formatClock(left * 1000)}
      </span>
      <div className={s.bar} aria-hidden="true">
        <div className={s.fill} style={{ transform: `scaleX(${fraction})` }} />
      </div>
      <span className="sr-only" role="status">
        {WARNINGS[left] ?? ""}
      </span>
    </div>
  );
}
