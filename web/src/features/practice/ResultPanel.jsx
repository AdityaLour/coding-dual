import { useEffect, useState } from "react";
import { Link } from "react-router";
import { languageById } from "@/features/duel/languages.js";
import { runSummary, timeAgo, verdictLine } from "./logic.js";
import Tabs from "./Tabs.jsx";
import s from "./ResultPanel.module.css";

const TICK = (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 10.5l4 4 8-9" />
  </svg>
);

function Line({ line, ms }) {
  return (
    <>
      <span className={s.vname}>{line.name}</span>
      {line.detail ? <span className={s.det}>{line.detail}</span> : null}
      {ms ? <span className={s.ms}>{ms} ms</span> : null}
    </>
  );
}

// The verdict box. Good: it fills with bone from the left and the text turns to ink with it.
// Bad: it shakes once in orange.
function Verdict({ line, ms }) {
  return (
    <div className={`${s.verdict} ${line.good ? s.good : s.bad}`}>
      <div className={s.vtxt}>
        <Line line={line} ms={ms} />
      </div>
      {line.good && (
        <div className={s.fill} aria-hidden="true">
          <div className={s.vtxt}>
            <Line line={line} ms={ms} />
          </div>
        </div>
      )}
    </div>
  );
}

function Example({ number, run, sample }) {
  const ok = run.verdict === "Accepted";
  return (
    <div className={s.example}>
      <div className={s.exHead}>
        <span className={ok ? s.pass : s.fail}>
          {ok && TICK}
          {ok ? "Passed" : run.verdict}
        </span>
        <span>Example {number}</span>
        <span className={s.exMs}>{run.ms} ms</span>
      </div>
      <div className={s.exBody}>
        <div>
          <small>Your output</small>
          <pre>{run.output?.trimEnd() || " "}</pre>
        </div>
        <div>
          <small>Expected</small>
          <pre>{sample?.output.trimEnd()}</pre>
        </div>
      </div>
    </div>
  );
}

function Result({ phase, samples, next }) {
  switch (phase.kind) {
    case "judging":
      return (
        <p className={s.note}>
          Judging. You can keep editing; the result is for the code you sent.
        </p>
      );
    case "notice":
      return (
        <>
          <div className={`${s.verdict} ${s.bad}`}>
            <div className={s.vtxt}>
              <span className={s.det}>{phase.message}</span>
            </div>
          </div>
          <p className={s.note}>Your code is still in the editor.</p>
        </>
      );
    case "run":
      return (
        <>
          <Verdict line={runSummary(phase)} />
          {(phase.results ?? []).map((run, index) => (
            <Example key={index} number={index + 1} run={run} sample={samples[index]} />
          ))}
          {phase.verdict === "Accepted" && (
            <p className={s.note}>
              Passing the examples is not the same as passing the hidden tests. Submit to find out.
            </p>
          )}
        </>
      );
    case "verdict": {
      const line = verdictLine(phase);
      return (
        <>
          <Verdict line={line} ms={phase.runtimeMs} />
          {line.good ? (
            <>
              <div className={s.after}>
                <Link to="/practice" className="btn btn-secondary">
                  Back to Practice
                </Link>
                {next && (
                  <Link to={`/practice/${next}`} className="btn btn-primary">
                    Next problem
                  </Link>
                )}
              </div>
              <p className={s.note}>Solved. Your accepted code is saved under History.</p>
            </>
          ) : (
            phase.verdict !== "Judge Error" && (
              <p className={s.note}>
                Tests are hidden: you see which one failed, never what is in it.
              </p>
            )
          )}
        </>
      );
    }
    default:
      return (
        <p className={s.note}>
          Run tests your code on the examples. Submit judges it against everything. Neither changes your rating.
        </p>
      );
  }
}

function History({ history, onLoad, isDirty }) {
  const [asking, setAsking] = useState(null); // the row whose "Replace your code?" is showing

  useEffect(() => {
    if (asking === null) return;
    const timer = setTimeout(() => setAsking(null), 3000);
    return () => clearTimeout(timer);
  }, [asking]);

  if (history === null) return <p className={s.note}>Loading your attempts…</p>;
  if (history.length === 0)
    return <p className={s.note}>Your attempts on this problem will appear here.</p>;

  const open = (row) => {
    if (isDirty() && asking !== row.id) return setAsking(row.id);
    setAsking(null);
    onLoad(row.id);
  };
  return (
    <>
      <table className={s.history}>
        <thead>
          <tr>
            <th>When</th>
            <th>Language</th>
            <th>Verdict</th>
            <th>Time</th>
            <th>
              <span className="sr-only">Code</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {history.map((row, index) => (
            <tr key={row.id} style={{ "--i": index }}>
              <td>{timeAgo(row.createdAt)}</td>
              <td>{languageById(row.languageId).name}</td>
              <td className={row.verdict === "Accepted" ? s.accepted : s.wrong}>
                {row.verdict === "Judging"
                  ? "Judging…"
                  : row.verdict === "Wrong Answer" && row.failedTest
                    ? `Wrong Answer · test ${row.failedTest}`
                    : row.verdict}
              </td>
              <td>{row.runtimeMs ? `${row.runtimeMs} ms` : "—"}</td>
              <td>
                <button type="button" onClick={() => open(row)}>
                  {asking === row.id ? "Replace your code?" : "View code"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className={s.note}>Only you can see these. Opening one loads that code into the editor.</p>
    </>
  );
}

// Under the editor: what the last Run or Submit did, and the person's own attempts.
export default function ResultPanel({ phase, history, samples, next, isDirty, onLoad }) {
  const [tab, setTab] = useState("result");
  // A new Run or Submit brings the Result tab back.
  const [seen, setSeen] = useState(phase.n);
  if (seen !== phase.n) {
    setSeen(phase.n);
    setTab("result");
  }
  const count = history?.length ? `(${history.length})` : "";

  return (
    <div className={s.panel}>
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "result", label: "Result" },
          { id: "history", label: "History", note: count },
        ]}
      />
      <div className={s.body} role="status" aria-live="polite">
        {/* A new key replays the entrance for every new result. */}
        {tab === "result" ? (
          <div key={phase.n} className={s.stack}>
            <Result phase={phase} samples={samples} next={next} />
          </div>
        ) : (
          <div className={s.stack}>
            <History history={history} onLoad={onLoad} isDirty={isDirty} />
          </div>
        )}
      </div>
    </div>
  );
}
