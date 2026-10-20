import { Link } from "react-router";
import CountUp from "@/features/duel/result/CountUp.jsx";
import { gainText } from "./logic.js";
import s from "./Leaderboard.module.css";

// How close the next place is, as a bar: 60 points or more away is empty, level is full.
const closeness = (points) => Math.max(0, Math.min(1, 1 - points / 60));

// "Your standing": placing, ranked, or nobody ranked yet. Every case says what to do next.
export default function Standing({ me, data, anyRanked }) {
  if (!me || (me.placing === null && me.rank === null)) {
    return (
      <div className={`${s.card} ${s.st}`}>
        <h2>Your standing</h2>
        <p className={s.note}>
          {anyRanked ? "Finish placement to appear on the board." : "Nobody is ranked yet. Finish 5 rated duels and you could be first."}
        </p>
        <Link className={s.btn} to="/home">
          Find a duel
        </Link>
      </div>
    );
  }
  if (me.placing !== null) {
    const total = data.placementDuels;
    return (
      <div className={`${s.card} ${s.st}`}>
        <h2>Your standing</h2>
        <div className={s.big}>
          <span className={s.rank}>{me.placing}</span>
          <span className={s.of}>of {total} placement duels</span>
        </div>
        <div className={s.pips} aria-hidden="true">
          {Array.from({ length: total }, (_, n) => (
            <i key={n} data-on={n < me.placing || undefined} />
          ))}
        </div>
        <p className={s.note}>
          Play {total - me.placing} more rated duels to appear on the board. Your rating already moves as you play.
        </p>
        <Link className={s.btn} to="/home">
          Find a duel
        </Link>
      </div>
    );
  }
  return (
    <div className={`${s.card} ${s.st}`}>
      <h2>Your standing</h2>
      <div className={s.big}>
        <span className={s.rank}>
          #<CountUp from={me.rank + 12} to={me.rank} delay={400} duration={900} />
        </span>
        <span className={s.of}>of {data.all.total} ranked</span>
      </div>
      <div className={s.gap}>
        {me.next ? (
          <>
            <span>
              <b className={s.pts}>{me.next.points}</b> points to pass <b>{me.next.username}</b> (#{me.next.rank})
            </span>
            <div className={s.bar} aria-hidden="true">
              <i style={{ transform: `scaleX(${closeness(me.next.points).toFixed(2)})` }} />
            </div>
          </>
        ) : (
          <span>You are first. Win rated duels to stay there.</span>
        )}
      </div>
      <div className={s.row2}>
        <span>Rating</span>
        <b>{me.rating}</b>
      </div>
      <div className={s.row2}>
        <span>This week</span>
        <b>
          {me.week.qualified
            ? `${gainText(me.week.gain)} · #${me.week.rank}`
            : `${me.week.duels} of ${data.weeklyMinDuels} duels`}
        </b>
      </div>
    </div>
  );
}
