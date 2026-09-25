import { Link } from "react-router";
import Logo from "./Logo.jsx";
import DoodleFace from "./DoodleFace.jsx";
import s from "./ComingSoon.module.css";

// Honest placeholder for pages that exist in the plan but aren't built yet.
export default function ComingSoon({ title, children }) {
  return (
    <main className={s.page}>
      <title>{`${title} — Boip`}</title>
      <meta name="robots" content="noindex" />
      <Logo />
      <div className={s.body}>
        <DoodleFace size={96} />
        <h1 className={s.title}>{title}</h1>
        <p className={s.text}>{children}</p>
        <Link to="/home" className="btn btn-secondary">
          Back to home
        </Link>
      </div>
    </main>
  );
}
