import { useCallback, useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/shared/hooks/usePrefersReducedMotion.js";
import { DIFFICULTIES } from "./logic.js";
import { compareTopics, topicName } from "./topics.js";
import s from "./Filters.module.css";

// The topic chips in a row that scrolls sideways, with an arrow at each end that appears
// only while there is more to see in that direction.
function Chips({ children }) {
  const track = useRef(null);
  const reduced = usePrefersReducedMotion();
  const [more, setMore] = useState({ left: false, right: false });

  const measure = useCallback(() => {
    const el = track.current;
    if (!el) return;
    setMore({
      left: el.scrollLeft > 4,
      right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4,
    });
  }, []);

  useEffect(() => {
    measure();
    const watch = new ResizeObserver(measure);
    watch.observe(track.current);
    return () => watch.disconnect();
  }, [measure]);

  const go = (direction) =>
    track.current.scrollBy({
      left: direction * track.current.clientWidth * 0.7,
      behavior: reduced ? "auto" : "smooth",
    });

  return (
    <div className={s.wrap}>
      <div ref={track} className={s.chips} role="group" aria-label="Topic" onScroll={measure}>
        {children}
      </div>
      {/* Mouse and touch helpers only: the chips themselves are all reachable with the keyboard. */}
      {more.left && (
        <button type="button" className={`${s.arrow} ${s.left}`} onClick={() => go(-1)} tabIndex={-1} aria-label="Show earlier topics">
          ‹
        </button>
      )}
      {more.right && (
        <button type="button" className={`${s.arrow} ${s.right}`} onClick={() => go(1)} tabIndex={-1} aria-label="Show more topics">
          ›
        </button>
      )}
    </div>
  );
}

// Difficulty, hide-solved, and a chip per topic with how many of it you have solved.
export default function Filters({ filters, onChange, topics }) {
  const set = (patch) => onChange({ ...filters, ...patch });
  return (
    <div className={s.filters}>
      <div className={s.row}>
        <div className={s.seg} role="group" aria-label="Difficulty">
          {["All", ...DIFFICULTIES].map((name) => (
            <button key={name} type="button" aria-pressed={filters.difficulty === name} onClick={() => set({ difficulty: name })}>
              {name}
            </button>
          ))}
        </div>
        <label className={s.check}>
          <input type="checkbox" checked={filters.hideSolved} onChange={(event) => set({ hideSolved: event.target.checked })} />
          Hide solved
        </label>
      </div>
      <Chips>
        <button type="button" className={s.chip} aria-pressed={filters.topic === "all"} onClick={() => set({ topic: "all" })}>
          All topics
        </button>
        {Object.entries(topics)
          .sort(([a], [b]) => compareTopics(a, b))
          .map(([slug, { solved, total }]) => (
            <button key={slug} type="button" className={s.chip} aria-pressed={filters.topic === slug} onClick={() => set({ topic: slug })}>
              {topicName(slug)}
              <small>
                {solved}/{total}
              </small>
            </button>
          ))}
      </Chips>
    </div>
  );
}
