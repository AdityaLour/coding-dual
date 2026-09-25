import { useInView } from "@/shared/hooks/useInView.js";
import DoodleFace from "@/shared/ui/DoodleFace.jsx";
import s from "./BoardPreview.module.css";

// Top of the leaderboard plus your own row. `leaders` is empty until rated duels
// exist, so the list shows an honest empty state instead of made-up players.
// Rows slide in each time the list arrives on screen.
export default function BoardPreview({ player, leaders = [] }) {
  const [ref, inView] = useInView(0.4);
  return (
    <ol ref={ref} className={`${s.rows} ${inView ? s.in : ""}`}>
      {leaders.length === 0 && (
        <li className={`${s.row} ${s.empty}`}>
          <svg
            className={s.crown}
            width="22"
            height="16"
            viewBox="0 0 22 16"
            aria-hidden="true"
          >
            <path
              d="M1 15 L2 3 L7 9 L11 1 L15 9 L20 3 L21 15 Z"
              fill="none"
              stroke="var(--you)"
              strokeWidth="2"
              strokeLinejoin="round"
            />
          </svg>
          No rated duels yet. The first winner takes the top spot.
        </li>
      )}
      {leaders.map((leader, i) => (
        <li key={leader.id} className={s.row}>
          <span className={s.n}>{i + 1}</span>
          <span className={s.player}>
            <DoodleFace variant={i + 1} size={32} />
            <span className={s.pname}>{leader.name}</span>
          </span>
          <span className={s.r}>{leader.rating}</span>
        </li>
      ))}
      <li className={`${s.row} ${s.mine}`}>
        <span className={s.n}>–</span>
        <span className={s.player}>
          <DoodleFace size={32} />
          <span className={s.pname}>{player.name} (you)</span>
        </span>
        <span className={s.r}>{player.rank}</span>
      </li>
    </ol>
  );
}
