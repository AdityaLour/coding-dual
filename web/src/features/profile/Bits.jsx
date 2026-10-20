import { Link } from "react-router";
import { resultTag, resultWord } from "./logic.js";
import s from "./Profile.module.css";

// Small pieces every tab uses.

export const Skel = ({ height, width = "100%", className = "" }) => (
  <div className={`${s.skel} ${className}`} style={{ height, width }} aria-hidden="true" />
);

export function Failed({ title, message, onRetry }) {
  return (
    <div className={s.empty} role="alert">
      <h3>{title}</h3>
      <p>{message}</p>
      <button type="button" className={s.btn} onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}

export function Empty({ title, children, primary, secondary }) {
  return (
    <div className={s.empty}>
      <h3>{title}</h3>
      <p>{children}</p>
      <div className={s.emptyRow}>
        {primary && (
          <Link className={s.btn} to={primary.to}>
            {primary.label}
          </Link>
        )}
        {secondary && (
          <Link className={`${s.btn} ${s.ghost}`} to={secondary.to}>
            {secondary.label}
          </Link>
        )}
      </div>
    </div>
  );
}

// The slanted W / L / D tag. `duel` is { result, rated }.
export function ResultTag({ duel }) {
  const tag = resultTag(duel);
  return (
    <span className={s.rtag} data-r={tag} title={resultWord(tag)[0].toUpperCase() + resultWord(tag).slice(1)}>
      <span className="sr-only">{resultWord(tag)}</span>
      <span aria-hidden="true">{tag === "U" ? "–" : tag}</span>
    </span>
  );
}

// "+12" / "−8" / "0", coloured. Unrated duels say so instead.
export function Delta({ duel, text }) {
  if (!duel.rated) return <span className={`${s.dl} ${s.z}`}>unrated</span>;
  const kind = duel.delta > 0 ? s.up : duel.delta < 0 ? s.dn : s.z;
  return <span className={`${s.dl} ${kind}`}>{text}</span>;
}

const LEVEL = { easy: "e", medium: "m", hard: "h" };
const levelClass = (difficulty) => LEVEL[String(difficulty).toLowerCase()] ?? "";

export function LevelTag({ difficulty }) {
  if (!difficulty) return null;
  return <span className={`${s.tag} ${s[levelClass(difficulty)] ?? ""}`}>{difficulty}</span>;
}
