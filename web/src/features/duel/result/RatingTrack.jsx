import s from "./Result.module.css";

// A 200-point ruler around the player's rating with a hollow dot where they started and a solid one
// where they ended. The dot slides across while the number counts up. All motion is transform only.
export default function RatingTrack({ before, after }) {
  const centre = Math.round(before / 100) * 100;
  const at = (rating) =>
    Math.max(0, Math.min(100, ((rating - (centre - 100)) / 200) * 100));
  const [from, to] = [at(before), at(after)];
  const gain = after >= before;
  return (
    <div className={s.trackBox} aria-hidden="true">
      <div className={s.track}>
        <div className={s.line} />
        <div
          className={`${s.fill} ${gain ? s.gain : s.loss}`}
          style={{
            left: `${Math.min(from, to)}%`,
            width: `${Math.abs(to - from)}%`,
            transformOrigin: gain ? "left center" : "right center",
          }}
        />
        {[-100, 0, 100].map((step) => (
          <span
            key={step}
            className={`${s.tick} ${step === 0 ? s.tickMid : ""}`}
            style={{ left: `${at(centre + step)}%` }}
          >
            {centre + step}
          </span>
        ))}
        <span className={s.was} style={{ left: `${from}%` }} />
        <span
          className={`${s.now} ${gain ? s.gain : s.loss}`}
          style={{ "--from": from, "--to": to }}
        />
      </div>
    </div>
  );
}
