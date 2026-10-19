import { useEffect, useRef } from "react";
import { useDuel } from "./duelContext.js";
import { formatRating } from "./format.js";
import s from "./Versus.module.css";

const TOTAL_MS = 2400;
const LAND_MS = 2100; // the names are in the header: the header shows them, the panes rise
const DONE_MS = 2300; // the intro is over and the clock is the player's
const STEP_MS = 20;

const clamp = (x) => Math.min(1, Math.max(0, x));
const easeOut = (x) => 1 - (1 - x) ** 3;
const easeInOut = (x) => (x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2);

// One keyframe every STEP_MS, from a function of time. Dense sampling lets one animation carry every
// easing in the intro with plain linear interpolation between frames.
const track = (props) =>
  Array.from({ length: TOTAL_MS / STEP_MS + 1 }, (_, i) => ({
    offset: (i * STEP_MS) / TOTAL_MS,
    easing: "linear",
    ...props(i * STEP_MS),
  }));

// Where a name has to end up: the box of its header slot, and how much smaller its text is there.
function target(fly, slot, side) {
  const nameOf = (element) => element.querySelector("[data-name]");
  if (!slot || !nameOf(slot)) return null;
  const from = fly.getBoundingClientRect();
  const to = slot.getBoundingClientRect();
  const size = (element) =>
    parseFloat(getComputedStyle(nameOf(element)).fontSize);
  return {
    dx: side === "left" ? to.left - from.left : to.right - from.right,
    dy: to.top - from.top,
    scale: size(slot) / size(fly),
  };
}

// The slam between "Rival found" and the duel: the scrim drops, both names fly in, VS lands with a
// flash and a shake, then the names shrink into the header. `getSlot` finds the header's two name blocks.
// Clicking or pressing Escape skips it. All motion is transform and opacity on the Web Animations API.
export default function Versus({ getSlot, onLand, onDone }) {
  const { me, duel } = useDuel();
  const scrimRef = useRef(null);
  const stageRef = useRef(null);
  const youRef = useRef(null);
  const rivalRef = useRef(null);
  const vsRef = useRef(null);
  const flashRef = useRef(null);
  const callbacks = useRef({ onLand, onDone });
  useEffect(() => {
    callbacks.current = { onLand, onDone };
  });
  const finished = useRef(false);

  useEffect(() => {
    const [scrim, stage, you, rival, vs, flash] = [
      scrimRef,
      stageRef,
      youRef,
      rivalRef,
      vsRef,
      flashRef,
    ].map((ref) => ref.current);
    const width = window.innerWidth;
    const mine = target(you, getSlot("me"), "left");
    const theirs = target(rival, getSlot("rival"), "right");

    // A name: in from its side (300-700), held, then into the header (1700-2200), fading at 2100-2250.
    const fly = (side, home) => (t) => {
      const sign = side === "left" ? -1 : 1;
      const arrive = 1 - easeOut(clamp((t - 300) / 400));
      const go = easeInOut(clamp((t - 1700) / 500));
      const x = sign * (width + 80) * arrive + (home ? home.dx * go : 0);
      const y = home ? home.dy * go : 0;
      const scale = home ? 1 - (1 - home.scale) * go : 1;
      return {
        opacity: t < 300 ? 0 : 1 - clamp((t - 2100) / 150),
        transform: `translate(${x}px, ${y}px) scale(${scale})`,
      };
    };

    const play = (element, props) =>
      element.animate(track(props), { duration: TOTAL_MS, fill: "both" });
    const animations = [
      play(scrim, (t) => ({
        opacity: clamp(t / 300) * (1 - clamp((t - 1900) / 400)),
      })),
      play(you, fly("left", mine)),
      play(rival, fly("right", theirs)),
      play(vs, (t) => ({
        opacity: clamp((t - 700) / 100) - clamp((t - 1700) / 200),
        transform: `translateY(-50%) scale(${3 - 2 * easeOut(clamp((t - 700) / 220))})`,
      })),
      play(flash, (t) => ({
        opacity: t > 800 && t < 1100 ? 0.85 * (1 - clamp((t - 800) / 300)) : 0,
      })),
      play(stage, (t) => ({
        transform: `translateX(${t > 800 && t < 1100 ? Math.sin(t / 11) * 8 * (1 - clamp((t - 800) / 300)) : 0}px)`,
      })),
    ];

    const timers = [
      setTimeout(callbacks.current.onLand, LAND_MS),
      setTimeout(done, DONE_MS),
    ];
    function done() {
      if (finished.current) return;
      finished.current = true;
      callbacks.current.onLand();
      callbacks.current.onDone();
    }
    const skip = (event) =>
      event.type === "keydown" && event.key !== "Escape" ? undefined : done();
    window.addEventListener("keydown", skip);
    window.addEventListener("pointerdown", skip);

    return () => {
      timers.forEach(clearTimeout);
      animations.forEach((animation) => animation.cancel());
      window.removeEventListener("keydown", skip);
      window.removeEventListener("pointerdown", skip);
    };
  }, [getSlot]);

  return (
    <>
      <p className="sr-only" role="status">
        Matched with {duel.opponent}.
      </p>
      <div className={s.layer} aria-hidden="true">
        <div ref={scrimRef} className={s.scrim} />
        <div ref={stageRef} className={s.stage}>
          <div ref={youRef} className={`${s.fly} ${s.you}`}>
            <span className={s.name} data-name>
              {me.username}
            </span>
            <span className={s.rating}>{formatRating(duel.rating, false)}</span>
          </div>
          <div ref={rivalRef} className={`${s.fly} ${s.rival}`}>
            <span className={s.name} data-name>
              {duel.opponent}
            </span>
            <span className={s.rating}>
              {formatRating(duel.opponentRating, false)}
            </span>
          </div>
          <div ref={vsRef} className={s.vs}>
            VS
          </div>
        </div>
        <div ref={flashRef} className={s.flash} />
      </div>
    </>
  );
}
