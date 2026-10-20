import { Link } from "react-router";
import s from "./Leaderboard.module.css";

export function Empty({ period }) {
  const all = period === "all";
  return (
    <div className={s.empty}>
      <svg viewBox="0 0 22 16" aria-hidden="true">
        <path d="M1 15 L2 3 L7 9 L11 1 L15 9 L20 3 L21 15 Z" fill="none" stroke="var(--you)" strokeWidth="2" strokeLinejoin="round" />
      </svg>
      <h2>{all ? "Nobody has a rank yet" : "A quiet week"}</h2>
      <p>
        {all
          ? "Finish 5 rated duels and the top spot is yours to take."
          : "Nobody has played enough rated duels since Monday. Be the first on the board."}
      </p>
      <Link className={s.btn} to="/home">
        Find a duel
      </Link>
    </div>
  );
}

export function Loading() {
  const widths = ["38%", "30%", "44%", "26%", "36%", "32%"];
  return (
    <div role="status" aria-label="Loading the leaderboard">
      {widths.map((w) => (
        <div key={w} className={s.sk}>
          <i style={{ width: 20 }} />
          <i className={s.c} />
          <i style={{ width: w }} />
          <i style={{ width: 60, marginLeft: "auto" }} />
        </div>
      ))}
    </div>
  );
}

export function Failed({ message, onRetry }) {
  return (
    <div className={s.fail} role="alert">
      <h2>Couldn&apos;t load the leaderboard</h2>
      <p>{message} Your rating isn&apos;t affected.</p>
      <button type="button" className={`${s.btn} ${s.btnSecondary}`} onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}

export function Stale() {
  return (
    <div className={s.stale} role="status">
      Showing the last list we loaded. Couldn&apos;t refresh it just now.
    </div>
  );
}
