import { useServerNow } from "@/features/daily/useNow.js";
import { clockDigits } from "@/features/daily/time.js";
import s from "./FlipClock.module.css";

// Countdown to the moment the daily changes; each digit flips when it changes.
// `until` is that moment (epoch ms) and `skew` corrects a device clock that is off.
export default function FlipClock({ until, skew }) {
  const digits = clockDigits(until - useServerNow(skew));
  const cells = [...digits];
  const label = `${digits.slice(0, 2)} hours ${digits.slice(2, 4)} minutes ${digits.slice(4)} seconds`;

  return (
    <div
      className={s.clock}
      role="timer"
      aria-label={`Daily changes in ${label}`}
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
