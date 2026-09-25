import { useRef } from "react";
import { Link } from "react-router";
import Logo from "@/shared/ui/Logo.jsx";
import HomeHeader from "./HomeHeader.jsx";
import HomeHero from "./HomeHero.jsx";
import MiniEditor from "./MiniEditor.jsx";
import InviteLink from "./InviteLink.jsx";
import FlipClock from "./FlipClock.jsx";
import WeekStrip from "./WeekStrip.jsx";
import BoardPreview from "./BoardPreview.jsx";
import Journey from "./journey/Journey.jsx";
import SceneDoodle from "./journey/SceneDoodle.jsx";
import { useReveal } from "./useReveal.js";
import { FIRST_LINE, SAY } from "./homeCopy.js";
import s from "./HomePage.module.css";

// Until accounts are wired to the backend, the player is a placeholder.
const PLAYER = { name: "aditya", rank: "Unranked" };

function Section({ id, station, className = "", children }) {
  const ref = useReveal(s.shown, s.hiding);
  return (
    <section
      id={id}
      className={`${s.sec} ${className}`}
      data-station={station}
      data-say={SAY[station]}
      aria-labelledby={`${id}-title`}
    >
      <div ref={ref} className={s.content}>
        {children}
      </div>
      <SceneDoodle scene={station} />
    </section>
  );
}

function Heading({ id, children }) {
  return (
    <h2 id={id} className={s.heading}>
      <span className={s.txt}>{children}</span>
    </h2>
  );
}

export default function HomePage() {
  const rootRef = useRef(null);

  return (
    <div ref={rootRef} className={s.page}>
      <title>Home — Boip</title>
      <meta name="robots" content="noindex" />

      <HomeHeader player={PLAYER} />

      <main>
        <div data-journey-start>
          <HomeHero player={PLAYER} />
        </div>

        <Section id="practice" station="practice">
          <Heading id="practice-title">Practice</Heading>
          <p>
            Solve problems on your own. No rival, no clock, no rating change.
          </p>
          <MiniEditor />
          <Link className={s.cta} to="/practice">
            Start practising
          </Link>
        </Section>

        <Section id="friend" station="friend">
          <Heading id="friend-title">Duel a friend</Heading>
          <p>
            Create a private duel and send the code to someone you know. Not
            rated.
          </p>
          <InviteLink />
        </Section>

        <Section id="daily" station="daily" className={s.dailySec}>
          <Heading id="daily-title">Daily challenge</Heading>
          <p>
            One problem for everyone, every day. Launching soon; the daily reset
            is at midnight.
          </p>
          <FlipClock />
          <WeekStrip />
          <Link className={s.cta} to="/daily">
            About the daily challenge
          </Link>
        </Section>

        <Section id="board" station="board">
          <Heading id="board-title">Leaderboard</Heading>
          <BoardPreview player={PLAYER} />
          <Link className={s.cta} to="/leaderboard">
            See the full leaderboard
          </Link>
        </Section>
      </main>

      <footer className={s.foot} data-station="end" data-say={SAY.end}>
        <Logo />
        <span>Two coders. One problem.</span>
      </footer>

      <Journey rootRef={rootRef} firstLine={FIRST_LINE} />
    </div>
  );
}
