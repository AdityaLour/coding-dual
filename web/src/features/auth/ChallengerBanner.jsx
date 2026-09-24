import s from "./ChallengerBanner.module.css";

// Fighting-game banner that slams across the screen while the page changes behind it.
// direction: 1 slides in from the right, -1 from the left.
export default function ChallengerBanner({ text, direction }) {
  return (
    <div
      className={s.overlay}
      style={{ "--dir": direction }}
      aria-hidden="true"
    >
      <div className={s.banner}>
        <span className={s.text}>{text}</span>
      </div>
    </div>
  );
}
