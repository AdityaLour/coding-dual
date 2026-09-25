import { useEffect, useState } from "react";
import s from "./FlipClock.module.css";

function untilMidnight() {
  const now = new Date();
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  const t = Math.floor((next - now) / 1000);
  return [Math.floor(t / 3600), Math.floor(t / 60) % 60, t % 60]
    .map((n) => String(n).padStart(2, "0"))
    .join("");
}

// Countdown to local midnight; each digit flips when it changes.
export default function FlipClock() {
  const [digits, setDigits] = useState(untilMidnight);

  useEffect(() => {
    const id = setInterval(() => setDigits(untilMidnight()), 1000);
    return () => clearInterval(id);
  }, []);

  const cells = [...digits];
  const label = `${digits.slice(0, 2)} hours ${digits.slice(2, 4)} minutes ${digits.slice(4)} seconds`;

  return (
    <div
      className={s.clock}
      role="timer"
      aria-label={`Daily reset in ${label}`}
    >
      {cells.map((c, i) => (
        <span key={i} className={s.group} aria-hidden="true">
          {i > 0 && i % 2 === 0 && <span className={s.sep}>:</span>}
          {/* keyed by value: a changed digit remounts, which replays the flip */}
          <span key={`${i}-${c}`} className={`${s.digit} ${s.flip}`}>
            {c}
          </span>
        </span>
      ))}
    </div>
  );
}
