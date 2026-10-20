import { useEffect, useRef } from "react";
import { usePrefersReducedMotion } from "@/shared/hooks/usePrefersReducedMotion.js";

const OUT_MS = 700;

// Two-way reveal: adds `shown` whenever the element arrives on screen, and plays
// `hiding` whenever it leaves, every time. Class changes only; no re-renders.
export function useReveal(shownClass, hidingClass) {
  const ref = useRef(null);
  const reduceMotion = usePrefersReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (reduceMotion) {
      el.classList.add(shownClass);
      return undefined;
    }
    let hideTimer = 0;
    // Watch the section around the element, not the element itself: Chrome counts an element's own
    // clip-path as hidden, and the Daily card starts fully clipped, so it could never be seen to arrive.
    const watched = el.parentElement ?? el;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          clearTimeout(hideTimer);
          el.classList.remove(hidingClass);
          void el.offsetWidth; // restart the reveal animation
          el.classList.add(shownClass);
        } else if (el.classList.contains(shownClass)) {
          el.classList.remove(shownClass);
          el.classList.add(hidingClass);
          hideTimer = setTimeout(
            () => el.classList.remove(hidingClass),
            OUT_MS,
          );
        }
      },
      { threshold: 0.35 },
    );
    observer.observe(watched);
    return () => {
      observer.disconnect();
      clearTimeout(hideTimer);
    };
  }, [shownClass, hidingClass, reduceMotion]);

  return ref;
}
