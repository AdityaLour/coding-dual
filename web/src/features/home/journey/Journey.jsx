import { useEffect, useRef, useSyncExternalStore } from "react";
import { usePrefersReducedMotion } from "@/shared/hooks/usePrefersReducedMotion.js";
import { createJourney } from "./engine.js";
import s from "./Journey.module.css";

const WIDE = "(min-width: 901px)";
const subscribeWide = (onChange) => {
  const media = window.matchMedia(WIDE);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
};

// Overlay that draws the route and runs the walker. It reads stops from
// elements inside `rootRef` marked with data-station / data-say.
export default function Journey({ rootRef, firstLine }) {
  const reduceMotion = usePrefersReducedMotion();
  const wide = useSyncExternalStore(
    subscribeWide,
    () => window.matchMedia(WIDE).matches,
    () => true,
  );
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const wrapRef = useRef(null);
  const bubbleRef = useRef(null);

  useEffect(() => {
    if (!wide || reduceMotion || !rootRef.current) return undefined;
    let destroy = () => {};
    let cancelled = false;
    const begin = () => {
      if (cancelled) return;
      destroy = createJourney({
        root: rootRef.current,
        container: containerRef.current,
        svg: svgRef.current,
        bubbleWrap: wrapRef.current,
        bubble: bubbleRef.current,
        styles: s,
        firstLine,
      });
    };
    // Wait for fonts so section heights (and so the stops) are final.
    if (document.fonts?.status === "loading") document.fonts.ready.then(begin);
    else begin();
    return () => {
      cancelled = true;
      destroy();
    };
  }, [wide, reduceMotion, rootRef, firstLine]);

  return (
    <div ref={containerRef} className={s.journey} aria-hidden="true">
      <svg ref={svgRef} className={s.svg} />
      <div ref={wrapRef} className={s.bubbleWrap}>
        <div ref={bubbleRef} className={s.bubble} />
      </div>
    </div>
  );
}
