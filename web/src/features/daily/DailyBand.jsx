import WeekStrip from "./WeekStrip.jsx";
import { useServerNow } from "./useNow.js";
import { clockDigits, clockText, dateLabel, daysText } from "./time.js";
import s from "./DailyBand.module.css";

// The strip above today's problem: which day it is, the streak, the week, and the time left.
export default function DailyBand({ daily, skew }) {
  const left = clockText(clockDigits(daily.resetsAt - useServerNow(skew)));
  const { current, longest } = daily.streak;
  return (
    <section className={s.band} aria-label="Daily challenge">
      <div className={s.title}>
        <h1>Daily challenge</h1>
        <span>{dateLabel(daily.date)}</span>
      </div>
      <p className={s.streak}>
        <b>{daysText(current)}</b> streak
        {longest > current && <span className={s.best}>best {daysText(longest)}</span>}
      </p>
      <WeekStrip week={daily.week} label="This week" />
      <p className={`${s.state} ${daily.solvedToday ? s.done : ""}`}>
        {daily.solvedToday ? "Solved today." : "Not solved yet."} New problem in{" "}
        <time className={s.left}>{left}</time>
      </p>
    </section>
  );
}
