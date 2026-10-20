import { useEffect, useState } from "react";
import { countdown, countdownText, weekFraction } from "./logic.js";
import s from "./Leaderboard.module.css";

// "Resets in 5d 10h 50m 12s" and a bar for how much of the week has gone, off the server's clock.
export default function Countdown({ startsAt, endsAt, skew }) {
  const [now, setNow] = useState(() => Date.now() + skew);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now() + skew), 1000);
    return () => clearInterval(timer);
  }, [skew]);

  return (
    <div className={s.reset}>
      <div>
        Resets Monday 00:00 IST, in <b>{countdownText(countdown(endsAt - now))}</b>
      </div>
      <div className={s.wk} aria-hidden="true">
        <i style={{ transform: `scaleX(${weekFraction(now, startsAt, endsAt).toFixed(3)})` }} />
      </div>
    </div>
  );
}
