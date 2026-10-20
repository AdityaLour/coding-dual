import { useState } from "react";
import { RANGES, chartPoints, longDate, rangeLabel, ratingFacts, gainText } from "./logic.js";
import RatingChart from "./RatingChart.jsx";
import { Empty, Failed, Skel } from "./Bits.jsx";
import s from "./Profile.module.css";

const RANGE_TEXT = { 10: "Last 10", 30: "Last 30" };

export default function RatingTab({ summary, series, retry }) {
  const [range, setRange] = useState(30);

  if (series.status === "error")
    return <Failed title="Couldn't load your rating history" message={`${series.message} Your rating isn't affected.`} onRetry={retry} />;
  if (series.status !== "ready") return <Skel height={420} />;
  const data = series.data;
  if (data.points.length === 0)
    return (
      <Empty title="Your rating chart starts here" primary={{ to: "/home", label: "Find a duel" }}>
        After your first rated duel you&apos;ll see every rating change as a line. Your rating is provisional until you&apos;ve played {data.placementDuels}.
      </Empty>
    );

  const points = chartPoints(data, range);
  const facts = ratingFacts(data, summary);
  const peakAt = data.points.find((p) => p.after === facts.peak);
  return (
    <div className={s.card}>
      <div className={s.rtop}>
        <h2 className={s.plain}>Rating after each rated duel</h2>
        <div className={s.seg} role="group" aria-label="Range">
          {RANGES.map((value) => (
            <button key={value} type="button" aria-pressed={range === value} onClick={() => setRange(value)}>
              {value === "all" ? rangeLabel("all", data) : RANGE_TEXT[value]}
            </button>
          ))}
        </div>
      </div>
      <RatingChart points={points} placementDuels={data.placementDuels} />
      <div className={s.rstats}>
        <div className={s.rs}>
          <small>Now</small>
          <b>{facts.now}</b>
        </div>
        <div className={s.rs}>
          <small>Highest</small>
          <b>{facts.peak}</b>
          {peakAt && <i>{longDate(peakAt.t)}</i>}
        </div>
        <div className={s.rs}>
          <small>Lowest</small>
          <b>{facts.low}</b>
        </div>
        <div className={s.rs}>
          <small>Best win</small>
          <b>{facts.best ? gainText(facts.best.delta) : "–"}</b>
          {facts.best && <i>vs {facts.best.opponent}</i>}
        </div>
      </div>
    </div>
  );
}
