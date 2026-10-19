import { useCallback, useEffect, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router";
import PageLoader from "@/shared/ui/PageLoader.jsx";
import { usePrefersReducedMotion } from "@/shared/hooks/usePrefersReducedMotion.js";
import { useDuel } from "./duelContext.js";
import { clearDrafts } from "./drafts.js";
import Arena from "./Arena.jsx";
import Versus from "./Versus.jsx";
import FinishBurst, { FINISH_MS } from "./FinishBurst.jsx";
import ResultScreen from "./result/ResultScreen.jsx";

const RESUME_GRACE_MS = 600; // opened by URL: the server's resume follows its welcome by a moment

// The duel route. One screen at a time:
//   intro   the Versus slam, straight after "Rival found" (skipped with reduced motion, or on a reload)
//   arena   the duel
//   finish  the duel shrinks away under the finish burst
//   result  the result screen
export default function DuelPage() {
  const { me, phase, duel, end, resigned, find, begin, leave } = useDuel();
  const reduceMotion = usePrefersReducedMotion();
  const navigate = useNavigate();
  const slots = useRef({}); // the header's two name blocks, for the intro to land on
  const setSlot = useCallback((which, element) => {
    slots.current[which] = element;
  }, []);
  const getSlot = useCallback((which) => slots.current[which], []);
  const arenaShown = useRef(false); // has the duel been on screen? (then ending it plays the finish)
  const [view, setView] = useState(() =>
    phase === "ended"
      ? "result"
      : phase === "found" && !reduceMotion
        ? "intro"
        : "arena",
  );
  const [landed, setLanded] = useState(false);
  const [waited, setWaited] = useState(false);

  // No duel to show (opened by URL, or it ended without us): a short wait for a resume, then Home.
  useEffect(() => {
    if (!me) return undefined;
    const timer = setTimeout(() => setWaited(true), RESUME_GRACE_MS);
    return () => clearTimeout(timer);
  }, [me]);

  // With reduced motion there is no intro: play starts at once.
  useEffect(() => {
    if (phase === "found" && view === "arena") begin();
  }, [phase, view, begin]);

  // The duel ended. If we were looking at it, show the finish; if not (a reload, a result we were away for),
  // go straight to the result.
  useEffect(() => {
    if (phase !== "ended") return;
    setView((current) =>
      current === "arena" && arenaShown.current && !reduceMotion
        ? "finish"
        : "result",
    );
  }, [phase, reduceMotion]);
  useEffect(() => {
    if (view !== "finish") return undefined;
    const timer = setTimeout(() => setView("result"), FINISH_MS);
    return () => clearTimeout(timer);
  }, [view]);

  // Closing the tab mid-duel starts the disconnect clock: ask first.
  const live = view === "intro" || view === "arena";
  useEffect(() => {
    if (!live || phase === "ended") return undefined;
    const ask = (event) => event.preventDefault();
    window.addEventListener("beforeunload", ask);
    return () => window.removeEventListener("beforeunload", ask);
  }, [live, phase]);

  const gone = phase === "idle" || phase === "searching";
  const showingArena = view !== "result" && !gone && Boolean(duel);
  useEffect(() => {
    if (showingArena) arenaShown.current = true;
  }, [showingArena]);

  if (view !== "result" && gone) {
    return waited ? <Navigate to="/home" replace /> : <PageLoader />;
  }

  const finishUp = (andSearch) => {
    clearDrafts(duel?.duelId);
    leave();
    if (andSearch) find();
    navigate("/home");
  };

  if (view === "result" && end) {
    return (
      <ResultScreen
        end={end}
        duel={duel}
        resigned={resigned}
        onAgain={() => finishUp(true)}
        onHome={() => finishUp(false)}
      />
    );
  }
  if (!duel) return <PageLoader />;

  return (
    <>
      <title>Duel — Boip</title>
      <meta name="robots" content="noindex" />
      <Arena
        setSlot={setSlot}
        revealed={view !== "intro" || landed}
        leaving={view === "finish"}
      />
      {view === "intro" && (
        <Versus
          getSlot={getSlot}
          onLand={() => setLanded(true)}
          onDone={() => {
            begin();
            setView("arena");
          }}
        />
      )}
      {view === "finish" && <FinishBurst />}
    </>
  );
}
