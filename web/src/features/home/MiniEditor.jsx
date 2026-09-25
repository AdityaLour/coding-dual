import { useEffect, useState } from "react";
import { useInView } from "@/shared/hooks/useInView.js";
import { usePrefersReducedMotion } from "@/shared/hooks/usePrefersReducedMotion.js";
import s from "./MiniEditor.module.css";

const SOLUTION = "a, b = map(int, input().split())\nprint(a + b)";

// A small editor that types out a solution and gets "Accepted", on a loop.
// Illustration only; it runs only while on screen.
export default function MiniEditor() {
  const [ref, inView] = useInView(0.3);
  const reduceMotion = usePrefersReducedMotion();
  const [typed, setTyped] = useState("");
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    if (reduceMotion || !inView) return undefined;
    let cancelled = false;
    let timer = 0;
    const wait = (ms) =>
      new Promise((resolve) => {
        timer = setTimeout(resolve, ms);
      });
    (async () => {
      while (!cancelled) {
        setTyped("");
        setAccepted(false);
        for (let i = 1; i <= SOLUTION.length && !cancelled; i++) {
          setTyped(SOLUTION.slice(0, i));
          await wait(SOLUTION[i - 1] === "\n" ? 260 : 42);
        }
        await wait(300);
        if (!cancelled) setAccepted(true);
        await wait(2200);
      }
    })();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [inView, reduceMotion]);

  const text = reduceMotion ? SOLUTION : typed;
  const done = reduceMotion || accepted;

  return (
    <div ref={ref} className={s.editor} aria-hidden="true">
      <div className={s.bar}>
        <span>solution.py</span>
        <span className={`${s.badge} ${done ? s.on : ""}`}>Accepted</span>
      </div>
      <pre className={s.code}>{text}</pre>
    </div>
  );
}
