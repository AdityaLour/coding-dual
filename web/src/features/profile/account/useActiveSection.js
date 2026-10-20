import { useCallback, useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/shared/hooks/usePrefersReducedMotion.js";
import { activeSection, reachLine } from "../logic.js";

// A section counts as reached once its top is this far down from the top of the window
// (under the sticky tab bar). Near the bottom of the page the line slides down (see reachLine).
const OFFSET = 150;

// Which section the reader is in. Measured from the real positions on every scroll frame, not guessed from
// "which section crossed a line" events, so the highlight follows the page without lag.
// A click jumps the highlight at once and keeps it there until the reader scrolls again: the page often cannot
// scroll far enough to put a lower section at the top, and the highlight must not wander off by itself.
export function useActiveSection(ids) {
  const [active, setActive] = useState(ids[0]);
  const hold = useRef(false);
  const want = useRef(null); // the section the last click asked for
  const picked = useRef(null); // { y }: where the page came to rest after that click
  const settle = useRef(0);
  const measure = useRef(() => {});
  const release = useRef(() => {});
  const reduceMotion = usePrefersReducedMotion();

  useEffect(() => {
    let frame = 0;
    measure.current = () => {
      if (picked.current) {
        if (Math.abs(window.scrollY - picked.current.y) < 3) return; // still where the click left it
        picked.current = null;
      }
      const tops = ids.map((id) => ({ id, top: document.getElementById(`acct-${id}`)?.getBoundingClientRect().top ?? Infinity }));
      const remaining = document.documentElement.scrollHeight - window.innerHeight - window.scrollY;
      setActive(activeSection(tops, reachLine(OFFSET, remaining, window.innerHeight), false) ?? ids[0]);
    };
    release.current = () => {
      hold.current = false;
      picked.current = { y: window.scrollY };
      if (want.current) setActive(want.current);
    };
    const onScroll = () => {
      if (hold.current) {
        clearTimeout(settle.current);
        settle.current = setTimeout(() => release.current(), 140); // the scroll has been still for a moment
        return;
      }
      if (!frame)
        frame = requestAnimationFrame(() => {
          frame = 0;
          measure.current();
        });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    measure.current();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(frame);
      clearTimeout(settle.current);
    };
  }, [ids]);

  const go = useCallback(
    (id) => {
      const target = document.getElementById(`acct-${id}`);
      if (!target) return;
      setActive(id);
      want.current = id;
      picked.current = null;
      hold.current = true;
      clearTimeout(settle.current);
      // If the page does not need to move, no scroll event will come, so let go anyway.
      settle.current = setTimeout(() => release.current(), 250);
      target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    },
    [reduceMotion],
  );

  return [active, go];
}
