import CountUp from "@/features/duel/result/CountUp.jsx";
import DoodleFace from "@/shared/ui/DoodleFace.jsx";
import { gainText } from "./logic.js";
import s from "./Leaderboard.module.css";

const Crown = () => (
  <svg className={s.crown} viewBox="0 0 22 16" aria-hidden="true">
    <path
      d="M1 15 L2 3 L7 9 L11 1 L15 9 L20 3 L21 15 Z"
      fill="var(--bg)"
      stroke="var(--you)"
      strokeWidth="2"
      strokeLinejoin="round"
    />
  </svg>
);

const ORDER = [1, 0, 2]; // second, first, third: the winner stands in the middle

// The top three. `again` is true after a switch between boards: the blocks stay and only the content changes.
export default function Podium({ entries, period, again }) {
  if (entries.length < 3) return null;
  const all = period === "all";
  return (
    <ol className={`${s.podium} ${again ? s.again : ""}`} aria-label="Top three">
      {ORDER.map((i) => {
        const e = entries[i];
        const place = i + 1;
        return (
          <li key={e.username} className={`${s.pod} ${s[`p${place}`]}`}>
            <div className={s.who}>
              {place === 1 && <Crown />}
              <DoodleFace variant={e.isMe ? 0 : e.face} size={place === 1 ? 76 : 70} />
            </div>
            <div className={s.blk}>
              <span className={s.no} aria-hidden="true">
                {place}
              </span>
              <span className={s.nm}>
                <span className="sr-only">Rank {place}: </span>
                {e.username}
                {e.isMe ? " (you)" : ""}
              </span>
              <span className={s.num}>
                <CountUp
                  from={0}
                  to={all ? e.rating : e.gain}
                  delay={again ? 0 : 500}
                  duration={900}
                  format={all ? String : gainText}
                />
              </span>
              <span className={s.lbl}>{all ? "rating" : "points this week"}</span>
              <span className={s.sub}>
                {all ? `${e.wins}–${e.losses} · ${e.duels} duels` : `rating ${e.rating} · ${e.weekDuels} duels`}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
