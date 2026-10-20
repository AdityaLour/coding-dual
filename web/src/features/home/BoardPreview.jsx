import { useState } from "react";
import { useInView } from "@/shared/hooks/useInView.js";
import DoodleFace from "@/shared/ui/DoodleFace.jsx";
import { gainText } from "@/features/leaderboard/logic.js";
import { readPeriod, writePeriod } from "@/features/leaderboard/period.js";
import { useBoard } from "@/features/leaderboard/useBoard.js";
import s from "./BoardPreview.module.css";

const SHOWN = 5;

const Crown = () => (
  <svg className={s.crown} width="22" height="16" viewBox="0 0 22 16" aria-hidden="true">
    <path d="M1 15 L2 3 L7 9 L11 1 L15 9 L20 3 L21 15 Z" fill="none" stroke="var(--you)" strokeWidth="2" strokeLinejoin="round" />
  </svg>
);

// Your own line when you are not among the rows shown: where you are, or what is left to do.
function mineLine(me, period, board, data) {
  if (me.placing !== null) return { rank: "–", value: `placing ${me.placing}/${data.placementDuels}` };
  if (period === "all") return { rank: me.rank, value: String(me.rating) };
  if (me.week.qualified) return { rank: me.week.rank, value: gainText(me.week.gain) };
  return { rank: "–", value: `${me.week.duels}/${data.weeklyMinDuels} duels` };
}

// The top of the leaderboard plus your own line, with the same two boards as the full page.
// Rows slide in each time the list arrives on screen.
export default function BoardPreview({ player }) {
  const { state, retry } = useBoard();
  const [period, setPeriod] = useState(readPeriod);
  const [ref, inView] = useInView(0.4);
  const choose = (next) => {
    setPeriod(next);
    writePeriod(next);
  };

  const ready = state.status === "ready";
  const data = ready ? state.data : null;
  const board = ready ? (period === "week" ? data.week : data.all) : null;
  const top = board ? board.entries.slice(0, SHOWN) : [];
  const meInTop = top.some((e) => e.isMe);
  const me = data?.me && (data.me.placing !== null || data.me.rank !== null) ? data.me : null;
  const extra = ready && me && !meInTop ? mineLine(me, period, board, data) : null;

  return (
    <div ref={ref} className={`${s.wrap} ${inView ? s.in : ""}`}>
      <div className={s.seg} role="group" aria-label="Ranking period">
        <button type="button" aria-pressed={period === "all"} onClick={() => choose("all")}>
          All-time
        </button>
        <button type="button" aria-pressed={period === "week"} onClick={() => choose("week")}>
          This week
        </button>
      </div>

      {state.status === "loading" && (
        <div className={s.rows} role="status" aria-label="Loading the leaderboard">
          {[0, 1, 2, 3, 4].map((n) => (
            <div key={n} className={`${s.row} ${s.sk}`}>
              <i /> <i /> <i />
            </div>
          ))}
        </div>
      )}

      {state.status === "error" && (
        <div className={s.fail} role="alert">
          <p>{state.message}</p>
          <button type="button" className={s.retry} onClick={retry}>
            Try again
          </button>
        </div>
      )}

      {ready && (
        <ol key={period} className={s.rows} aria-label={period === "all" ? "All-time top five" : "This week's top five"}>
          {top.length === 0 && (
            <li className={`${s.row} ${s.empty}`}>
              <Crown />
              {period === "all"
                ? "No ranked players yet. The first winner takes the top spot."
                : "A quiet week. The first player to win rated duels takes the top spot."}
            </li>
          )}
          {top.map((e, i) => (
            <li key={e.username} className={s.row} data-me={e.isMe || undefined} style={{ "--i": i }}>
              <span className={s.n}>{e.rank}</span>
              <span className={s.player}>
                <DoodleFace variant={e.isMe ? 0 : e.face} size={32} />
                <span className={s.pname}>
                  {e.username}
                  {e.isMe ? " (you)" : ""}
                </span>
              </span>
              <span className={`${s.r} ${period === "week" && e.gain < 0 ? s.neg : ""}`}>
                {period === "all" ? e.rating : gainText(e.gain)}
              </span>
            </li>
          ))}
          {extra && (
            <>
              {typeof extra.rank === "number" && extra.rank > SHOWN + 1 && (
                <li className={s.dots} aria-hidden="true">
                  {"· · ·"}
                </li>
              )}
              <li className={`${s.row} ${s.mine}`} data-me style={{ "--i": top.length }}>
                <span className={s.n}>{extra.rank}</span>
                <span className={s.player}>
                  <DoodleFace size={32} />
                  <span className={s.pname}>{player.name} (you)</span>
                </span>
                <span className={`${s.r} ${typeof extra.rank === "number" ? "" : s.small}`}>{extra.value}</span>
              </li>
            </>
          )}
        </ol>
      )}
    </div>
  );
}
