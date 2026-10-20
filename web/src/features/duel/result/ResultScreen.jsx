import { useEffect, useMemo, useRef } from "react";
import DoodleFace from "@/shared/ui/DoodleFace.jsx";
import { usePrefersReducedMotion } from "@/shared/hooks/usePrefersReducedMotion.js";
import { useDuel } from "../duelContext.js";
import { formatDelta, formatElapsed } from "../format.js";
import { buildResult } from "./model.js";
import CountUp from "./CountUp.jsx";
import RatingTrack from "./RatingTrack.jsx";
import WinBurst from "./WinBurst.jsx";
import s from "./Result.module.css";

const SEAM = { win: ["82%", "84%"], loss: ["62%", "50%"], soft: ["72%", "68%"] }; // [across, down] where bone gives way to red
const count = String;
const clock = formatElapsed;

function Actions({ className, onAgain, onHome }) {
  return (
    <div className={`${s.actions} ${className}`}>
      <button type="button" className={s.primary} onClick={onAgain}>
        Find another duel
      </button>
      <button type="button" className={s.ghost} onClick={onHome}>
        Back to home
      </button>
    </div>
  );
}

// One side of the head-to-head card.
function Side({ side, name, player, winner, rated, delay }) {
  const you = side === "you";
  return (
    <div className={`${s.side} ${you ? s.sideYou : s.sideRival}`} style={{ "--at": delay }}>
      <span className={`${s.avatar} ${winner ? s.winner : ""}`}>
        <DoodleFace variant={you ? 0 : 1} side={you ? "you" : "opp"} size={104} background={you ? "var(--bg)" : "var(--opp-bg)"} />
      </span>
      <span className={s.sideName}>{name}</span>
      <span className={s.sideRating}>
        <span className={s.was2}>{player.before}</span>
        <span className={s.was2}>→</span>
        <CountUp from={player.before} to={player.after} delay={1300} duration={1300} className={s.now2} format={count} />
      </span>
      {rated && <span className={`${s.chip} ${s.chipSmall} ${player.delta >= 0 ? s.gain : s.loss}`}>{formatDelta(player.delta)}</span>}
      {winner && <span className={`${s.winnerTag} ${you ? s.tagYou : s.tagRival}`}>WINNER</span>}
    </div>
  );
}

// The result of a duel: a headline that lands (differently for a win, a loss and the rest), the rating
// moving, the head-to-head and the numbers. Each piece fades in on its own delay (--at, in ms);
// with reduced motion everything is simply there. Works from the server's duelEnd alone.
export default function ResultScreen({ end, duel, resigned, onAgain, onHome }) {
  const { me } = useDuel();
  const reduceMotion = usePrefersReducedMotion();
  const result = useMemo(() => buildResult(end, duel, resigned), [end, duel, resigned]);
  const heading = useRef(null);
  const page = useRef(null);
  const frame = useRef(0);
  const { mode, rated } = result;
  const gain = result.you.delta >= 0;

  useEffect(() => {
    heading.current?.focus({ preventScroll: true }); // a screen reader starts at the result
    return () => cancelAnimationFrame(frame.current);
  }, []);

  // With a mouse, the big number, the headline and the card drift with the pointer (CSS reads --mx / --my).
  // Touch and reduced motion skip it; setting a property on the page re-renders nothing.
  function follow(event) {
    if (reduceMotion || event.pointerType !== "mouse") return;
    const { clientX, clientY } = event;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const box = page.current?.getBoundingClientRect();
      if (!box) return;
      page.current.style.setProperty("--mx", ((clientX - box.left) / box.width * 2 - 1).toFixed(3));
      page.current.style.setProperty("--my", ((clientY - box.top) / box.height * 2 - 1).toFixed(3));
    });
  }

  const [seamAcross, seamDown] = SEAM[mode];
  const letters = [...result.headline];
  return (
    <div ref={page} onPointerMove={follow} className={`${s.page} ${s[mode]}`} style={{ "--seam-across": seamAcross, "--seam-down": seamDown }}>
      <title>{`${result.headline[0]}${result.headline.slice(1).toLowerCase()} — Boip`}</title>
      <meta name="robots" content="noindex" />
      <div className={s.zoom}>
        <div className={s.thud}>
          <div className={s.wash} aria-hidden="true" />
          <div className={s.seamBone} aria-hidden="true" />
          <div className={s.seamRed} aria-hidden="true" />
          {rated && (
            <div className={`${s.ghostNum} ${gain ? s.ghostGain : s.ghostLoss}`} aria-hidden="true">
              {formatDelta(result.you.delta)}
            </div>
          )}

          <main className={s.scroll}>
            <div className={s.grid}>
              <div className={s.left}>
                <h1 ref={heading} tabIndex={-1} className={s.headline} data-long={result.headline.length > 8}>
                  <span className="sr-only">{result.headline}</span>
                  <span className={s.letters} aria-hidden="true">
                    {letters.map((letter, index) =>
                      letter === " " ? (
                        <span key={index} className={s.space} />
                      ) : (
                        <span key={index} className={s.letter} style={{ "--i": index, "--rot": index % 2 ? "14deg" : "-14deg" }}>
                          {letter}
                        </span>
                      ),
                    )}
                  </span>
                </h1>
                <p className={`${s.reason} ${s.rise}`} style={{ "--at": 1000 }}>
                  {result.reason}
                </p>

                {rated ? (
                  <div className={`${s.rating} ${s.rise}`} style={{ "--at": 1200 }}>
                    <p className="sr-only">
                      Rating {result.you.before} to {result.you.after}, {formatDelta(result.you.delta)}.
                    </p>
                    <div className={s.ratingLine} aria-hidden="true">
                      <span className={s.ratingWas}>{result.you.before}</span>
                      <svg width="28" height="16" viewBox="0 0 34 20">
                        <path d="M2 10 H30 M22 3 L30 10 L22 17" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <CountUp from={result.you.before} to={result.you.after} delay={1300} duration={1300} className={s.ratingNow} format={count} />
                      <span className={`${s.chip} ${s.chipBig} ${gain ? s.gain : s.loss}`}>{formatDelta(result.you.delta)}</span>
                    </div>
                    <RatingTrack before={result.you.before} after={result.you.after} />
                  </div>
                ) : (
                  <p className={`${s.unrated} ${s.rise}`} style={{ "--at": 1200 }}>
                    {result.unratedReason === "pairCap"
                      ? "No rating change. You have played this rival 3 times today, so this duel did not count."
                      : "No rating change. This duel did not count."}
                  </p>
                )}

                {result.provisional && (
                  <p className={`${s.note} ${s.rise}`} style={{ "--at": 1500 }}>
                    Your rating is provisional until you have played 10 rated duels, so it moves faster for now.
                  </p>
                )}

                <Actions className={s.inline} onAgain={onAgain} onHome={onHome} />
              </div>

              <div className={s.right}>
                <section className={s.card} aria-label="Head to head">
                  <h2 className={s.cardTitle}>Head to head</h2>
                  <Side side="you" name={me?.username ?? "You"} player={result.you} winner={result.youWon} rated={rated} delay={1000} />
                  <span className={s.cardSeam} aria-hidden="true" />
                  <Side side="rival" name={result.rival.name} player={result.rival} winner={result.rivalWon} rated={rated} delay={1150} />
                  <div className={s.barRow}>
                    <span className={s.barLabel}>{result.bar.label}</span>
                    <div className={s.barTrack} aria-hidden="true">
                      <div className={`${s.barFill} ${s[`bar_${result.bar.kind}`]}`} style={{ "--ratio": result.barRatio }} />
                    </div>
                  </div>
                </section>

                <div className={`${s.tiles} ${s.rise}`} style={{ "--at": 1100 }}>
                  <div className={s.tile}>
                    <span className={s.tileLabel}>Time left</span>
                    {result.timeLeftMs == null ? (
                      <span className={s.tileNum}>—</span>
                    ) : (
                      <CountUp from={0} to={result.timeLeftMs} delay={1500} duration={1200} className={s.tileNum} format={clock} />
                    )}
                  </div>
                  <div className={s.tile}>
                    <span className={s.tileLabel}>Your submissions</span>
                    <CountUp from={0} to={result.submissions} delay={1600} duration={700} className={s.tileNum} format={count} />
                  </div>
                  <div className={s.tile}>
                    <span className={s.tileLabel}>Rival submissions</span>
                    <CountUp from={0} to={result.opponentSubmissions} delay={1700} duration={700} className={s.tileNum} format={count} />
                  </div>
                </div>
              </div>
            </div>
          </main>

          <Actions className={s.pinned} onAgain={onAgain} onHome={onHome} />
          {mode === "win" && !reduceMotion && <WinBurst origin={heading} />}
        </div>
      </div>
    </div>
  );
}
