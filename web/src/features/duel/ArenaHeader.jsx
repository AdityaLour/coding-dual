import { useDuel } from "./duelContext.js";
import Clock from "./Clock.jsx";
import s from "./ArenaHeader.module.css";

// The top of the duel: you on the left, the clock in the middle, your rival on the right, and under it
// the seam (bone for you, red for the rival). `setSlot` hands the two name blocks up so the Versus intro
// can land on them.
export default function ArenaHeader({ setSlot, revealed }) {
  const { me, duel, offset, away } = useDuel();
  const hidden = revealed ? "" : s.hidden;
  const rating = (value, provisional) => (
    <span className={s.rating}>
      {value}
      {provisional && <span className={s.provisional}> provisional</span>}
    </span>
  );

  return (
    <>
      <header className={s.header}>
        <div
          className={`${s.who} ${hidden}`}
          ref={(element) => setSlot("me", element)}
        >
          <span className={s.me} data-name>
            {me.username}
          </span>
          {rating(duel.rating, duel.provisional)}
        </div>
        <Clock
          endsAt={duel.endsAt}
          offset={offset}
          totalMs={duel.problem.minutes * 60_000}
        />
        <div className={`${s.rivalSide} ${hidden}`}>
          <div className={s.who} ref={(element) => setSlot("rival", element)}>
            <span className={s.rival} data-name>
              {duel.opponent}
            </span>
            {rating(duel.opponentRating, duel.opponentProvisional)}
          </div>
          <span
            className={`${s.dot} ${away ? s.away : ""}`}
            role="img"
            aria-label={away ? "Rival disconnected" : "Rival connected"}
          >
            <i />
          </span>
        </div>
      </header>
      <div className={s.seam} aria-hidden="true">
        <span className={s.seamYou} />
        <span className={s.seamOpp} />
      </div>
    </>
  );
}
