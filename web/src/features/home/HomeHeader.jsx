import { Link, useNavigate } from "react-router";
import Logo from "@/shared/ui/Logo.jsx";
import DoodleFace from "@/shared/ui/DoodleFace.jsx";
import s from "./HomeHeader.module.css";

// Site header for signed-in pages. Sits over the top of the hero.
export default function HomeHeader({ player }) {
  const navigate = useNavigate();
  return (
    <header className={s.header}>
      <Logo />
      <nav className={s.nav} aria-label="Account">
        <Link to="/leaderboard" className={s.link}>
          Leaderboard
        </Link>
        <Link
          to="/profile"
          className={`${s.link} ${s.who}`}
          aria-label={`Your profile: ${player.name}`}
        >
          <DoodleFace size={40} className={s.face} />
          <span className={s.name}>{player.name}</span>
        </Link>
        {/* Until sessions are wired up, logging out simply returns to the landing page. */}
        <button
          type="button"
          className={s.logout}
          onClick={() => navigate("/")}
        >
          Log out
        </button>
      </nav>
    </header>
  );
}
