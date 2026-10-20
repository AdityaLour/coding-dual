import { useLayoutEffect, useRef } from "react";
import DoodleFace from "@/shared/ui/DoodleFace.jsx";
import { usePrefersReducedMotion } from "@/shared/hooks/usePrefersReducedMotion.js";
import { gainText } from "./logic.js";
import s from "./Leaderboard.module.css";

const MOVE = { duration: 650, easing: "cubic-bezier(0.2, 0.7, 0.2, 1)" };
const ENTER = { duration: 420, easing: "cubic-bezier(0.2, 0.7, 0.2, 1)" };

// The ranked list. When `layoutKey` changes (another board, or fresh numbers) every row that stays
// glides from where it was to where it is now, and rows that were not there slide in.
// Positions are measured in page coordinates, so scrolling in between does not throw them off.
export default function Rows({ entries, period, intro, layoutKey, meRef }) {
  const list = useRef(null);
  const before = useRef(new Map());
  const lastKey = useRef(layoutKey);
  const reduceMotion = usePrefersReducedMotion();

  useLayoutEffect(() => {
    const after = new Map();
    const items = [...list.current.children];
    for (const li of items) after.set(li.dataset.key, li.getBoundingClientRect().top + window.scrollY);
    if (!reduceMotion && lastKey.current !== layoutKey && before.current.size) {
      for (const li of items) {
        const was = before.current.get(li.dataset.key);
        const now = after.get(li.dataset.key);
        if (was === undefined) {
          li.animate([{ opacity: 0, transform: "translateX(-16px)" }, { opacity: 1, transform: "none" }], ENTER);
        } else if (Math.abs(was - now) > 1) {
          li.animate([{ transform: `translateY(${was - now}px)` }, { transform: "none" }], MOVE);
        }
      }
    }
    before.current = after;
    lastKey.current = layoutKey;
  });

  const all = period === "all";
  return (
    <>
      <div className={s.colh} aria-hidden="true">
        <span>#</span>
        <span>Player</span>
        <span>{all ? "Rating" : "Gained"}</span>
        <span>{all ? "W–L" : "Rating"}</span>
        <span>Duels</span>
      </div>
      <ol ref={list} className={`${s.rows} ${intro ? s.intro : ""}`} aria-label={all ? "All-time ranking" : "This week's ranking"}>
        {entries.map((e, i) => (
          <li
            key={e.username}
            data-key={e.username}
            data-me={e.isMe || undefined}
            data-a={i < 14 || undefined}
            className={s.row}
            style={{ "--i": Math.min(i, 14) }}
            ref={e.isMe ? meRef : undefined}
          >
            <span className={s.rk}>{e.rank}</span>
            <span className={s.pl}>
              <DoodleFace variant={e.isMe ? 0 : e.face} size={36} />
              <span className={s.nm}>{e.username}</span>
              {e.isMe && <span className={s.tag}>you</span>}
            </span>
            <span className={`${s.c1} ${!all && e.gain < 0 ? s.neg : ""}`}>{all ? e.rating : gainText(e.gain)}</span>
            <span className={s.c2}>{all ? `${e.wins}–${e.losses}` : e.rating}</span>
            <span className={s.c3}>{all ? e.duels : e.weekDuels}</span>
          </li>
        ))}
      </ol>
    </>
  );
}
