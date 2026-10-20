import { Link } from "react-router";
import FlipClock from "./FlipClock.jsx";
import WeekStrip from "@/features/daily/WeekStrip.jsx";
import { useDaily } from "@/features/daily/useDaily.js";
import { daysText } from "@/features/daily/time.js";
import home from "./HomePage.module.css";
import s from "./DailySection.module.css";

// What sits under the "Daily challenge" heading on Home: the countdown, the streak and the week.
export default function DailySection() {
  const { status, daily, skew, retry } = useDaily();
  const ready = status === "ready";
  return (
    <>
      <p>One problem for everyone, every day. It changes at midnight IST.</p>
      {ready && (
        <>
          <p className={s.streak}>
            <b>{daysText(daily.streak.current)}</b> streak
            {daily.streak.longest > daily.streak.current && <span> · best {daysText(daily.streak.longest)}</span>}
          </p>
          <FlipClock until={daily.resetsAt} skew={skew} />
          <WeekStrip week={daily.week} />
        </>
      )}
      {status === "error" && (
        <p role="alert">
          Couldn't load today's challenge.{" "}
          <button type="button" className={s.retry} onClick={retry}>
            Try again
          </button>
        </p>
      )}
      <Link className={home.cta} to="/daily">
        {ready && daily.solvedToday ? "See today's problem" : "Solve today's problem"}
      </Link>
    </>
  );
}
