import { Link } from "react-router";
import CountUp from "@/features/duel/result/CountUp.jsx";
import DoodleFace from "@/shared/ui/DoodleFace.jsx";
import { gainText, stripCells, streakText } from "./logic.js";
import { Skel } from "./Bits.jsx";
import s from "./Profile.module.css";

const START = 1200;
const MONTH_YEAR = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" });

function Numbers({ summary }) {
  const placing = summary.placing !== null;
  return (
    <>
      <div className={s.rnum}>
        <CountUp from={START} to={summary.rating} delay={150} duration={900} />
      </div>
      <div className={s.rlbl}>{placing ? "rating, provisional" : "duel rating"}</div>
      <div className={s.chips}>
        {placing && (
          <span className={`${s.chip} ${s.hot}`}>
            Placing {summary.placing} / {summary.placementDuels}
          </span>
        )}
        {summary.rank !== null && (
          <Link className={`${s.chip} ${s.hot}`} to="/leaderboard">
            #{summary.rank} of {summary.ranked}
          </Link>
        )}
        {summary.week.duels > 0 && <span className={s.chip}>{gainText(summary.week.gain)} this week</span>}
      </div>
    </>
  );
}

export function Identity({ username, state }) {
  const summary = state.status === "ready" ? state.data : null;
  const played = summary?.counts.all ?? 0;
  return (
    <section className={s.idb} aria-label="Your profile">
      <div className={s.av}>
        <DoodleFace size={128} />
      </div>
      <div className={s.who}>
        <h1 className={s.heading}>
          <span className={s.txt}>{username}</span>
        </h1>
        {summary && (
          <p className={s.meta}>
            {played === 0 && summary.joinedAt > summary.now - 86400000 ? (
              "Joined today"
            ) : (
              <>
                Member since <b>{MONTH_YEAR.format(summary.joinedAt)}</b>
              </>
            )}
            {summary.record.rated > 0 && (
              <>
                {" · "}
                <b>{summary.record.rated}</b> rated {summary.record.rated === 1 ? "duel" : "duels"}
              </>
            )}
          </p>
        )}
      </div>
      <div className={s.rt}>
        {state.status === "ready" ? (
          <Numbers summary={summary} />
        ) : state.status === "error" ? (
          <span className={s.hint}>Numbers unavailable</span>
        ) : (
          <>
            <Skel width={150} height={58} />
            <Skel width={190} height={30} />
          </>
        )}
      </div>
    </section>
  );
}

// The last ten results as ten slanted slots, oldest on the left.
export function FormStrip({ summary }) {
  const cells = stripCells(summary.last10);
  const streak = streakText(summary.streak);
  return (
    <div className={s.formrow}>
      <span className={s.lbl}>Last 10</span>
      <ul className={s.pipsrow}>
        {cells.map((cell) =>
          cell.result === null ? (
            <li key={cell.key} className={s.pp} data-r="E" aria-hidden="true">
              <span />
            </li>
          ) : (
            <li key={cell.key} className={s.pp} data-r={cell.result} tabIndex={0} aria-label={cell.label}>
              <span aria-hidden="true">{cell.result === "U" ? "–" : cell.result}</span>
              <i className={s.tip} aria-hidden="true">
                {cell.tip}
              </i>
            </li>
          ),
        )}
      </ul>
      <span className={s.lbl}>
        {streak ? (
          <>
            <b>{summary.streak.current}</b> wins in a row
          </>
        ) : summary.counts.all === 0 ? (
          "No duels yet"
        ) : null}
      </span>
    </div>
  );
}
