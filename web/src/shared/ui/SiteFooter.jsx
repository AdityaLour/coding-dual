import LegalLinks from "./LegalLinks.jsx";
import { copyright } from "./legal.js";
import s from "./SiteFooter.module.css";

// The footer for pages people see before signing in.
//   "wordmark": links, a line of credit, and a huge cropped "Boip" (the landing page)
//   "compact":  one row (sign-in pages and the legal pages)
export default function SiteFooter({ variant = "compact", className = "" }) {
  if (variant === "compact") {
    return (
      <footer className={`${s.compact} ${className}`}>
        <span>{copyright()}</span>
        <LegalLinks />
      </footer>
    );
  }
  return (
    <footer className={`${s.root} ${className}`}>
      <div className={s.big}>
        <div className={s.row}>
          <LegalLinks />
          <p className={s.fine}>{copyright()}. Built by Aditya Lour.</p>
        </div>
        <span className={s.word} aria-hidden="true">
          <span className={s.you}>Bo</span>
          <span className={s.opp}>ip</span>
        </span>
      </div>
    </footer>
  );
}

// The one thin line at the bottom of pages inside the signed-in app.
export function AppFooterLine() {
  return (
    <footer className={s.line}>
      <span>{copyright()}</span>
      <LegalLinks />
    </footer>
  );
}
