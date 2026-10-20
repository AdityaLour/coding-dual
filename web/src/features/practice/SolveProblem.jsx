import { useRef } from "react";
import { Link } from "react-router";
import Statement from "@/features/duel/Statement.jsx";
import { topicName } from "./topics.js";
import { useFlight } from "./useFlight.js";
import s from "./SolveProblem.module.css";

// The left side: the statement and its examples. Hidden tests never reach the browser.
export default function SolveProblem({ problem }) {
  const title = useRef(null);
  const flying = useFlight(title, true);

  return (
    <section className={s.pane} aria-label="Problem">
      <Link to="/practice" className={s.back}>
        ← Practice
      </Link>
      <h1 ref={title} className={`${s.title} ${flying ? s.arriving : ""}`}>
        {problem.title}
      </h1>
      <p className={s.badges}>
        <span className={s.pill}>{problem.difficulty}</span>
        <span>rating {problem.rating}</span>
        <span>{topicName(problem.topic)}</span>
        <span>time limit {problem.timeLimitMs} ms</span>
        {problem.memoryMb ? <span>memory {problem.memoryMb} MB</span> : null}
      </p>
      <Statement text={problem.statement} />
      {problem.samples.length > 0 && (
        <div className={s.samples}>
          {problem.samples.map((sample, index) => (
            <div key={index} className={s.sample}>
              <span className="sr-only">Example {index + 1} input</span>
              <pre className={s.io}>{sample.input.trimEnd()}</pre>
              <span className="sr-only">Example {index + 1} output</span>
              <pre className={`${s.io} ${s.out}`}>{sample.output.trimEnd()}</pre>
            </div>
          ))}
        </div>
      )}
      <p className={s.hint}>Run checks the examples. Submit also runs the hidden tests.</p>
    </section>
  );
}
