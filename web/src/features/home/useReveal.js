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
    observer.observe(el);
    return () => {
      observer.disconnect();
      clearTimeout(hideTimer);
    };
  }, [shownClass, hidingClass, reduceMotion]);

  return ref;
}
