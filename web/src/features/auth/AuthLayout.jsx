import { useCallback, useEffect, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import Logo from "@/shared/ui/Logo.jsx";
import { usePrefersReducedMotion } from "@/shared/hooks/usePrefersReducedMotion.js";
import JudgeDoodle from "./JudgeDoodle.jsx";
import FloatingSymbols from "./FloatingSymbols.jsx";
import ChallengerBanner from "@/shared/ui/ChallengerBanner.jsx";
import SplitOpen from "./SplitOpen.jsx";
import { AUTH_COPY, modeFromPath } from "./authCopy.js";
import { randomHandle } from "./handles.js";
import s from "./AuthLayout.module.css";

const SWAP_AT_MS = 520; // the banner fully covers the middle here
const BANNER_MS = 1100;

// Shared shell for every auth page. It stays mounted while switching between them,
// so the doodle keeps running and typed values carry over.
export default function AuthLayout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const reduceMotion = usePrefersReducedMotion();
  const copy = AUTH_COPY[modeFromPath(pathname)];

  const [values, setValues] = useState(() => ({
    email: "",
    password: "",
    username: randomHandle(),
  }));
  const [banner, setBanner] = useState(null);
  const timers = useRef([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const setField = useCallback((field, value) => {
    setValues((v) => ({ ...v, [field]: value }));
  }, []);

  const switchTo = useCallback(
    (target) => {
      if (banner) return;
      if (reduceMotion) {
        navigate(target);
        return;
      }
      const targetMode = modeFromPath(target);
      setBanner({
        id: Date.now(),
        text: AUTH_COPY[targetMode].banner,
        direction: targetMode === "signup" ? 1 : -1,
      });
      timers.current.push(
        setTimeout(() => navigate(target), SWAP_AT_MS),
        setTimeout(() => setBanner(null), BANNER_MS),
      );
    },
    [banner, reduceMotion, navigate],
  );

  return (
    <>
      <div className={`${s.page} ${banner ? s.shaking : ""}`}>
        <div className={s.panel} aria-hidden="true" />
        <div className={s.bands} aria-hidden="true">
          <div className={s.bandYou} />
          <div className={s.bandOpp} />
        </div>

        <aside className={s.brand}>
          <Logo />
          <div className={s.doodle}>
            <JudgeDoodle />
          </div>
          <div className={s.brandText}>
            <p className={s.heading}>{copy.heading}</p>
            <p className={s.blurb}>{copy.blurb}</p>
          </div>
        </aside>

        <main className={s.formSide}>
          <FloatingSymbols />
          <div className={s.formPanel}>
            <Outlet context={{ values, setField, switchTo }} />
          </div>
        </main>
      </div>

      {banner && (
        <ChallengerBanner
          key={banner.id}
          text={banner.text}
          direction={banner.direction}
        />
      )}
      <SplitOpen />
    </>
  );
}
