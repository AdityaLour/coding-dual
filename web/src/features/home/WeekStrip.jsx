import s from "./WeekStrip.module.css";

const DAYS = ["M", "T", "W", "T", "F", "S", "S"];

// This week's daily-challenge squares. Empty until streaks exist in the backend;
// today's square pulses.
export default function WeekStrip() {
  const today = (new Date().getDay() + 6) % 7;
  return (
    <div className={s.week}>
      <span>Your week</span>
      <ol className={s.days}>
        {DAYS.map((d, i) => (
          <li
            key={i}
            className={`${s.day} ${i === today ? s.today : ""}`}
            aria-current={i === today ? "date" : undefined}
          >
            {d}
          </li>
        ))}
      </ol>
    </div>
  );
}
