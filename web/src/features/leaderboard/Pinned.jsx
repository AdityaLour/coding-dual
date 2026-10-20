import DoodleFace from "@/shared/ui/DoodleFace.jsx";
import s from "./Leaderboard.module.css";

// Your own place, stuck to the bottom of the screen whenever your row is out of sight.
export default function Pinned({ me, view, hidden, onJump }) {
  return (
    <div className={s.pin} data-hide={hidden || undefined}>
      <div className={s.pinIn} aria-hidden={hidden || undefined} inert={hidden || undefined}>
        <span className={s.pinR}>{view.rank}</span>
        <span className={s.pinWho}>
          <DoodleFace size={34} />
          <span>
            {me.username} (you)
            <small>{view.sub}</small>
          </span>
        </span>
        {view.value ? <span className={s.pinV}>{view.value}</span> : <span />}
        {view.canJump ? (
          <button type="button" onClick={onJump}>
            Show me
          </button>
        ) : (
          <span />
        )}
      </div>
    </div>
  );
}
