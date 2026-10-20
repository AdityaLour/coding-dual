import { useEffect, useLayoutEffect } from "react";
import { sceneFrame } from "./scene.js";

const setVars = (el, vars) => {
  if (!el) return;
  for (const [name, value] of Object.entries(vars)) el.style.setProperty(name, String(value));
};

// Reads the scroll position once per frame and hands the page its numbers as CSS variables.
// Nothing here causes a React render: scrolling stays off the main render path.
export function useScrollScene(parts, { flat, calm }) {
  const { root, act, stage, prac, rate, fin, onRating } = parts;

  // Layout effect so the first paint already has the right numbers.
  useLayoutEffect(() => {
    const els = [root, act, stage, prac, rate, fin].map((r) => r.current);
    if (els.some((el) => !el)) return undefined;
    let frame = 0;

    const pageTop = (el) => el.getBoundingClientRect().top + window.scrollY;

    const update = () => {
      frame = 0;
      const f = sceneFrame({
        y: window.scrollY,
        vh: window.innerHeight,
        actTop: pageTop(act.current),
        actH: act.current.offsetHeight,
        stageH: stage.current.offsetHeight,
        pracTop: pageTop(prac.current),
        pracH: prac.current.offsetHeight,
        rateTop: pageTop(rate.current),
        finTop: pageTop(fin.current),
        finH: fin.current.offsetHeight,
        flat,
        calm,
      });
      setVars(root.current, { "--g": f.g.toFixed(0) });
      setVars(act.current, {
        "--d": f.act.d.toFixed(4),
        "--bo": f.act.bo.toFixed(4),
        "--o0": f.act.o[0].toFixed(3),
        "--o1": f.act.o[1].toFixed(3),
        "--o2": f.act.o[2].toFixed(3),
      });
      setVars(prac.current, { "--p": f.prac.toFixed(4) });
      setVars(rate.current, { "--rate": f.rate.toFixed(4) });
      setVars(fin.current, { "--fin": f.fin.toFixed(4) });
      onRating(f.rating);
    };

    const kick = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", kick, { passive: true });
    window.addEventListener("resize", kick);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", kick);
      window.removeEventListener("resize", kick);
    };
  }, [root, act, stage, prac, rate, fin, onRating, flat, calm]);

  // Pictures and fonts change the page height after the first paint; measure once more.
  useEffect(() => {
    const again = () => window.dispatchEvent(new Event("resize"));
    window.addEventListener("load", again);
    document.fonts?.ready.then(again);
    return () => window.removeEventListener("load", again);
  }, []);
}
