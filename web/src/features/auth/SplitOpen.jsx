import s from "./SplitOpen.module.css";

// Entrance: the screen starts closed along the seam, a bone line flashes down it,
// then the two halves slide apart. Pure CSS, runs once when the auth screen mounts.
export default function SplitOpen() {
  return (
    <div className={s.layer} aria-hidden="true">
      <div className={`${s.half} ${s.left}`} />
      <div className={`${s.half} ${s.right}`} />
      <svg className={s.line} viewBox="0 0 100 100" preserveAspectRatio="none">
        <line x1="52" y1="0" x2="44" y2="100" />
      </svg>
    </div>
  );
}
