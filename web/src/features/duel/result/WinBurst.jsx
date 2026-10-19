import { useEffect, useRef } from "react";
import s from "./Result.module.css";

const START_MS = 500; // after the headline starts dropping
const SPARK_MS = 2200;
const SPARKS = 30;
const clamp = (x) => Math.min(1, Math.max(0, x));
const easeOut = (x) => 1 - (1 - x) ** 3;

// A win: two shockwave rings and a spray of bone sparks from the headline, on one canvas.
// `origin` is the headline's element. Nothing is drawn after ~2.7 s, and the loop stops with it.
export default function WinBurst({ origin }) {
  const canvas = useRef(null);

  useEffect(() => {
    const element = canvas.current;
    const context = element.getContext("2d");
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    const [width, height] = [window.innerWidth, window.innerHeight];
    element.width = width * ratio;
    element.height = height * ratio;
    context.scale(ratio, ratio);

    const box = origin.current.getBoundingClientRect();
    const [cx, cy] = [box.left + box.width / 2, box.top + box.height / 2];
    const k = Math.min(1, Math.max(0.5, width / 1440)); // phones get a smaller burst
    const begin = performance.now() + START_MS;
    let frame = 0;

    function draw(now) {
      const age = now - begin;
      context.clearRect(0, 0, width, height);
      context.strokeStyle = "#efe6d2";
      context.lineWidth = 3;
      for (const delay of [0, 140]) {
        const p = clamp((age - delay) / 1000);
        if (p <= 0 || p >= 1) continue;
        context.globalAlpha = 0.7 * (1 - p);
        context.beginPath();
        context.arc(
          cx,
          cy,
          30 + width * 0.9 * easeOut(p) * Math.max(k, 0.65),
          0,
          Math.PI * 2,
        );
        context.stroke();
      }
      const seconds = Math.max(0, age) / 1000;
      for (let i = 0; i < SPARKS; i++) {
        if (age < 0 || age > SPARK_MS) break;
        const angle = ((-160 + ((i * 47) % 140)) * Math.PI) / 180;
        const speed = (480 + ((i * 131) % 620)) * k;
        context.save();
        context.globalAlpha = 1 - clamp((age - 1500) / 700);
        context.translate(
          cx + Math.cos(angle) * speed * seconds,
          cy +
            Math.sin(angle) * speed * seconds +
            0.5 * 1500 * k * seconds * seconds,
        );
        context.rotate((seconds * (200 + (i % 7) * 90) * Math.PI) / 180);
        context.fillStyle = i % 5 === 0 ? "#ffffff" : "#efe6d2";
        context.fillRect(0, 0, 6 + (i % 3) * 2, 10 + (i % 4) * 2);
        context.restore();
      }
      if (age < SPARK_MS + 100) frame = requestAnimationFrame(draw);
      else context.clearRect(0, 0, width, height);
    }
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [origin]);

  return <canvas ref={canvas} className={s.burst} aria-hidden="true" />;
}
