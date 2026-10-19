import s from "./FinishBurst.module.css";

export const FINISH_MS = 1100;

// The moment a duel ends: two shockwave rings and a bone flash over the duel as it shrinks away.
export default function FinishBurst() {
  return (
    <div className={s.layer} aria-hidden="true">
      {[0, 150].map((delay) => (
        <svg
          key={delay}
          className={s.ring}
          viewBox="0 0 48 48"
          style={{ animationDelay: `${delay}ms` }}
        >
          <circle cx="24" cy="24" r="22" vectorEffect="non-scaling-stroke" />
        </svg>
      ))}
      <div className={s.flash} />
    </div>
  );
}
