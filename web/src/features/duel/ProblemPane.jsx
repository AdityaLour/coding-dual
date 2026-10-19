import { useEffect, useRef, useState } from "react";
import { useDuel } from "./duelContext.js";
import Statement from "./Statement.jsx";
import s from "./ProblemPane.module.css";

const COPIED_MS = 1300;

// One sample: its input and expected output, with a button that copies the input.
function Sample({ number, sample, onCopy }) {
  return (
    <div className={s.sample}>
      <button
        type="button"
        className={s.copy}
        onClick={() => onCopy(sample.input)}
        aria-label={`Copy example ${number} input`}
      >
        Copy
      </button>
      <span className="sr-only">Example {number} input</span>
      <pre className={s.io}>{sample.input.trimEnd()}</pre>
      <span className="sr-only">Example {number} output</span>
      <pre className={`${s.io} ${s.out}`}>{sample.output.trimEnd()}</pre>
    </div>
  );
}

// The left-hand side of the duel: the problem, its limits and its examples.
export default function ProblemPane({
  className = "",
  onWrite,
  showWrite,
  ...panel
}) {
  const { duel } = useDuel();
  const { title, statement, samples, timeLimitMs, memoryMb } = duel.problem;
  const [copied, setCopied] = useState(false);
  const hide = useRef(0);
  useEffect(() => () => clearTimeout(hide.current), []);

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      return; // no clipboard access (an insecure page, a denied permission): nothing to confirm
    }
    setCopied(true);
    clearTimeout(hide.current);
    hide.current = setTimeout(() => setCopied(false), COPIED_MS);
  };

  return (
    <section className={`${s.pane} ${className}`} {...panel}>
      <h1 className={s.title}>{title}</h1>
      <p className={s.limits}>
        <span>time limit {timeLimitMs} ms</span>
        {memoryMb ? <span>memory {memoryMb} MB</span> : null}
      </p>
      <Statement text={statement} />
      {samples.length > 0 && (
        <div className={s.samples}>
          {samples.map((sample, index) => (
            <Sample
              key={index}
              number={index + 1}
              sample={sample}
              onCopy={copy}
            />
          ))}
        </div>
      )}
      <p className={s.hidden}>
        Your code also runs against hidden tests when you submit.
      </p>
      {showWrite && (
        <div className={s.write}>
          <button type="button" onClick={onWrite}>
            Write your solution
          </button>
        </div>
      )}
      <p className={s.toast} role="status" data-shown={copied}>
        {copied ? "Copied" : ""}
      </p>
    </section>
  );
}
