import { useEffect, useState } from "react";
import s from "./Progress.module.css";

const ROLL_MS = 550;

// A number that rolls up when it changes: the old one leaves upward, the new one comes from below.
// Starts at `from` and rolls to `value` right after it first appears.
export default function RollNumber({ value, from = value }) {
  const [shown, setShown] = useState({ now: from, before: null });
  const [target, setTarget] = useState(from);

  // Move toward `value` one frame after mounting (and whenever it changes), so the change is seen.
  useEffect(() => {
    const frame = requestAnimationFrame(() => setTarget(value));
    return () => cancelAnimationFrame(frame);
  }, [value]);

  if (shown.now !== target) setShown({ now: target, before: shown.now });

  useEffect(() => {
    if (shown.before === null) return;
    const timer = setTimeout(
      () => setShown((current) => ({ ...current, before: null })),
      ROLL_MS,
    );
    return () => clearTimeout(timer);
  }, [shown.before]);

  return (
    <span className={s.roll}>
      <span className="sr-only">{value}</span>
      {shown.before !== null && (
        <span key={`out${shown.before}`} className={s.out} aria-hidden="true">
          {shown.before}
        </span>
      )}
      <span
        key={`in${shown.now}`}
        className={shown.before !== null ? s.in : undefined}
        aria-hidden="true"
      >
        {shown.now}
      </span>
    </span>
  );
}
