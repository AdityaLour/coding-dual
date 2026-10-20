import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router";
import Logo from "@/shared/ui/Logo.jsx";
import DoodleFace from "@/shared/ui/DoodleFace.jsx";
import { useAuth } from "@/shared/auth/useAuth.js";
import { useMyRank } from "@/features/leaderboard/useMyRank.js";
import s from "./HomeHeader.module.css";

// Site header for signed-in pages. Sits over the top of the hero.
export default function HomeHeader({ player }) {
  const navigate = useNavigate();
  const { logout, signedOut } = useAuth();
  const [state, setState] = useState("idle"); // "idle" | "leaving" | "failed"
  const rank = useMyRank(player.name);

  async function handleLogout() {
    setState("leaving");
    try {
      await logout(); // deletes the session on the server, not just the cookie
      navigate("/", { replace: true });
      signedOut();
    } catch {
      setState("failed");
    }
  }

  return (
    <header className={s.header}>
      <Logo />
      <nav className={s.nav} aria-label="Account">
        <NavLink to="/leaderboard" className={s.link}>
          <span className={s.linkText}>Leaderboard</span>
          {rank !== null && <span className={s.rank}>#{rank}</span>}
        </NavLink>
        <Link
          to="/profile"
          className={`${s.link} ${s.who}`}
          aria-label={`Your profile: ${player.name}`}
        >
          <DoodleFace size={40} className={s.face} />
          <span className={s.name}>{player.name}</span>
        </Link>
        <button
          type="button"
          className={s.logout}
          onClick={handleLogout}
          disabled={state === "leaving"}
        >
          {state === "leaving"
            ? "Logging out…"
            : state === "failed"
              ? "Retry log out"
              : "Log out"}
        </button>
        <span className={s.srOnly} aria-live="polite">
          {state === "failed"
            ? "Couldn't log out. Check your connection and try again."
            : ""}
        </span>
      </nav>
    </header>
  );
}
