import { useEffect, useState } from "react";
import { DIFFICULTIES } from "./logic.js";
import RollNumber from "./RollNumber.jsx";
import s from "./Progress.module.css";

const ratio = (part) => (part.total === 0 ? 0 : part.solved / part.total);

// How far along the person is: one big count and a bar for each difficulty.
// `before` is the progress when they last looked, so what changed since is seen happening.
export default function ProgressBand({ now, before }) {
  const [filled, setFilled] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() =>
      requestAnimationFrame(() => setFilled(true)),
    );
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <section className={s.band} aria-label="Your progress">
      <p className={s.big}>
        <RollNumber value={now.solved} from={before.solved} />
        <span className={s.of}>solved of {now.total}</span>
      </p>
      <ul className={s.tracks}>
        {DIFFICULTIES.map((name) => (
          <li key={name} className={s.track}>
            <span>{name}</span>
            <span
              className={s.bar}
              role="img"
              aria-label={`${now.by[name].solved} of ${now.by[name].total} ${name} solved`}
            >
              <i
                style={{
                  transform: `scaleX(${ratio(filled ? now.by[name] : before.by[name])})`,
                }}
              />
            </span>
            <span className={s.count}>
              {now.by[name].solved}/{now.by[name].total}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
