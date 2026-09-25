import s from "./PageLoader.module.css";

// Shown while a page's code is loading.
export default function PageLoader() {
  return (
    <div className={s.wrap} role="status">
      <div className={s.mark} aria-hidden="true">
        <span className={s.you} />
        <span className={s.opp} />
      </div>
      <span className={s.label}>Loading…</span>
    </div>
  );
}
