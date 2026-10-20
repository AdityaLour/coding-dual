import s from "./WeekStrip.module.css";

const NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

// This week's squares, Monday to Sunday: filled when the daily was solved that day, today's pulses.
// Colours come from --week-ink and --week-paper, so the strip works on a light card and on the dark page.
export default function WeekStrip({ week, label = "Your week" }) {
  return (
    <div className={s.week}>
      <span>{label}</span>
      <ol className={s.days}>
        {LETTERS.map((letter, i) => {
          const solved = week.solved[i];
          const isToday = i === week.today;
          const state = solved ? "solved" : i > week.today ? "ahead" : isToday ? "open" : "missed";
          return (
            <li
              key={i}
              className={`${s.day} ${s[state]} ${isToday ? s.today : ""}`}
              aria-current={isToday ? "date" : undefined}
            >
              <span aria-hidden="true">{letter}</span>
              <span className={s.sr}>
                {NAMES[i]}: {solved ? "solved" : i > week.today ? "to come" : isToday ? "not solved yet" : "not solved"}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
