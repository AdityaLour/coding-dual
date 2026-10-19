import { useLayoutEffect, useRef } from "react";
import { usePrefersReducedMotion } from "@/shared/hooks/usePrefersReducedMotion.js";

const easeOut = (x) => 1 - (1 - x) ** 3;

// A number that counts from `from` to `to` after `delay` ms. The count is written straight into the DOM
// (no React renders per frame); the final value is also there as plain text for screen readers.
export default function CountUp({
  from,
  to,
  delay,
  duration,
  format = String,
  className,
}) {
  const shown = useRef(null);
  const reduceMotion = usePrefersReducedMotion();

  useLayoutEffect(() => {
    const element = shown.current;
    if (reduceMotion || from === to) {
      element.textContent = format(to);
      return undefined;
    }
    element.textContent = format(from);
    const start = performance.now() + delay;
    let frame = requestAnimationFrame(function step(now) {
      const progress = Math.min(1, Math.max(0, (now - start) / duration));
      element.textContent = format(
        Math.round(from + (to - from) * easeOut(progress)),
      );
      if (progress < 1) frame = requestAnimationFrame(step);
    });
    return () => cancelAnimationFrame(frame);
  }, [from, to, delay, duration, format, reduceMotion]);

  return (
    <>
      <span className="sr-only">{format(to)}</span>
      <span ref={shown} className={className} aria-hidden="true" />
    </>
  );
}
