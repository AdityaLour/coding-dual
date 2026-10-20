import { useEffect, useRef, useState } from "react";
import { PAD, chartGeometry, nearestIndex, placementSpan, pointText } from "./logic.js";
import s from "./Profile.module.css";

const heightFor = (width) => (width < 520 ? 250 : 330);
const DOT = { L: "var(--opp)", D: "var(--text-2)", W: "var(--you)" };

// The rating line. Hover, touch, or the arrow keys read out one duel at a time.
export default function RatingChart({ points, placementDuels }) {
  const host = useRef(null);
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState(null);

  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    observer.observe(host.current);
    return () => observer.disconnect();
  }, []);

  const height = heightFor(width);
  const geo = width > 0 ? chartGeometry(points, width, height) : null;
  const n = points.length;
  const at = active !== null && active < n ? active : null; // the range can change under an open tooltip

  function indexAt(event) {
    const box = host.current.getBoundingClientRect();
    return nearestIndex(((event.clientX - box.left) * width) / box.width, geo);
  }

  function onKeyDown(event) {
    const move = { ArrowLeft: -1, ArrowRight: 1 }[event.key];
    if (event.key === "Home") setActive(0);
    else if (event.key === "End") setActive(n - 1);
    else if (move) setActive(Math.max(0, Math.min(n - 1, (at ?? n) + move)));
    else if (event.key === "Escape") setActive(null);
    else return;
    event.preventDefault();
  }

  const values = points.map((p) => p.after);
  const peak = values.indexOf(Math.max(...values));
  const low = values.indexOf(Math.min(...values));
  const band = geo && placementSpan(points, placementDuels);
  const note = (i, text, dy) => (
    <text
      className={s.bl}
      x={Math.min(Math.max(geo.x(i), PAD.left + 22), width - PAD.right - 22)}
      y={geo.y(values[i]) + dy}
      textAnchor="middle"
    >
      {text}
    </text>
  );

  const current = at !== null ? points[at] : null;
  const tip = current ? pointText(current) : null;
  const half = Math.min(120, width / 2);

  return (
    <div
      ref={host}
      className={s.chart}
      tabIndex={0}
      role="group"
      aria-label="Rating chart. Use the left and right arrow keys to move between duels."
      onPointerMove={(e) => geo && setActive(indexAt(e))}
      onPointerDown={(e) => geo && setActive(indexAt(e))}
      onPointerLeave={(e) => e.pointerType === "mouse" && setActive(null)}
      onKeyDown={onKeyDown}
      onBlur={() => setActive(null)}
    >
      {geo && (
        <svg viewBox={`0 0 ${width} ${height}`} height={height} aria-hidden="true">
          {geo.ticks.map((v) => (
            <g key={v}>
              <line className={s.gl} x1={PAD.left} x2={width - PAD.right} y1={geo.y(v)} y2={geo.y(v)} />
              <text className={s.ax} x={PAD.left - 8} y={geo.y(v) + 4} textAnchor="end">
                {v}
              </text>
            </g>
          ))}
          {band && (
            <>
              <rect
                className={s.band}
                x={geo.x(band.from)}
                y={PAD.top}
                width={geo.x(band.to) - geo.x(band.from)}
                height={height - PAD.top - PAD.bottom}
              />
              <text className={s.bl} x={geo.x(band.from) + 6} y={PAD.top + 13}>
                Placement
              </text>
            </>
          )}
          <path
            key={`${n}-${points[0].n}`}
            className={s.ln}
            style={{ "--len": geo.length }}
            d={points.map((p, i) => `${i ? "L" : "M"}${geo.x(i).toFixed(1)} ${geo.y(p.after).toFixed(1)}`).join(" ")}
          />
          {n <= 60 &&
            points.map((p, i) => (
              <circle
                key={i}
                cx={geo.x(i)}
                cy={geo.y(p.after)}
                r={i === n - 1 ? 5.5 : 3.2}
                fill={p.start ? "var(--bg)" : DOT[p.result]}
                stroke={p.start ? "var(--muted)" : "var(--bg)"}
                strokeWidth={i === n - 1 ? 2.5 : 1.5}
              />
            ))}
          {note(peak, `highest ${values[peak]}`, -12)}
          {low !== peak && values[low] < values[0] && note(low, `lowest ${values[low]}`, 20)}
          {current && (
            <g>
              <line className={s.cur} x1={geo.x(at)} x2={geo.x(at)} y1={PAD.top} y2={height - PAD.bottom} />
              <circle cx={geo.x(at)} cy={geo.y(current.after)} r="7" fill="none" stroke="var(--you)" strokeWidth="2" />
            </g>
          )}
        </svg>
      )}
      {current && (
        <div
          className={s.tipc}
          style={{ left: Math.min(Math.max(geo.x(at), half + 4), width - half - 4), top: geo.y(current.after) }}
        >
          <b>{tip.title}</b>
          <br />
          {tip.detail}
        </div>
      )}
      <p className="sr-only" aria-live="polite">
        {tip ? `${tip.title}. ${tip.detail}` : ""}
      </p>
    </div>
  );
}
