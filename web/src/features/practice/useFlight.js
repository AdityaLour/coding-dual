import { useLayoutEffect } from "react";
import { useLocation, useNavigate } from "react-router";
import { usePrefersReducedMotion } from "@/shared/hooks/usePrefersReducedMotion.js";

const FLIGHT_MS = 560;
const BASE_SIZE = 16; // the list's title size; the heading is this much larger

// Opening a problem from the list: the row's title travels to the heading's place while the page opens.
// The list hands over where the title was in the router state. The real heading is already there,
// fading in underneath; the traveller is a copy that is gone when it lands.
export function useFlight(titleRef, ready) {
  const { state, pathname } = useLocation();
  const navigate = useNavigate();
  const reduced = usePrefersReducedMotion();
  const flight = state?.flight;

  useLayoutEffect(() => {
    const heading = titleRef.current;
    if (!ready || !flight || !heading) return;
    // Used up: a reload must not replay it.
    navigate(pathname, { replace: true, state: null });
    if (reduced) return;

    const to = heading.getBoundingClientRect();
    const scale = parseFloat(getComputedStyle(heading).fontSize) / BASE_SIZE;
    const traveller = document.createElement("div");
    traveller.textContent = flight.text;
    traveller.setAttribute("aria-hidden", "true");
    traveller.style.cssText = `position:fixed;z-index:80;margin:0;left:${flight.left}px;top:${flight.top}px;pointer-events:none;transform-origin:left top;font:600 ${BASE_SIZE}px var(--font-body);white-space:nowrap;color:var(--text)`;
    document.body.append(traveller);
    const there = `translate(${to.left - flight.left}px,${to.top - flight.top}px) scale(${scale})`;
    const motion = traveller.animate(
      [
        { transform: "none", opacity: 1 },
        { transform: there, opacity: 0.9, offset: 0.7 },
        { transform: there, opacity: 0 },
      ],
      { duration: FLIGHT_MS, easing: "cubic-bezier(0.2, 0.7, 0.2, 1)" },
    );
    motion.onfinish = () => traveller.remove();
    return () => {
      motion.cancel();
      traveller.remove();
    };
    // Once, when the problem first appears.
  }, [ready]); // eslint-disable-line
  return Boolean(flight) && !reduced;
}
