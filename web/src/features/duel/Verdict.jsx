import s from "./Verdict.module.css";

// What the last submission did, in the strip under the editor. The strip is a polite live region,
// so a screen reader hears the verdict without having to look for it.
export default function Verdict({ judging, notice, last }) {
  let body;
  if (judging) {
    body = (
      <span className={s.plain}>
        Judging. Your rival can submit at the same time.
      </span>
    );
  } else if (notice) {
    body = (
      <div className={`${s.verdict} ${s.bad}`}>
        <span className={s.plain}>{notice}</span>
      </div>
    );
  } else if (last) {
    // key: a new verdict replays the entrance (a shake for a miss), the same one again still does.
    body = (
      <div
        key={last.at}
        className={`${s.verdict} ${last.correct ? s.good : s.bad}`}
      >
        <span className={s.name}>{last.verdict}</span>
        <span className={s.detail}>
          {last.correct
            ? "all tests passed"
            : last.failedTest
              ? `failed on test ${last.failedTest}`
              : ""}
        </span>
        {last.runtimeMs ? (
          <span className={s.ms}>{last.runtimeMs} ms</span>
        ) : null}
      </div>
    );
  } else {
    body = (
      <span className={s.hint}>
        Nothing submitted yet. Tests are hidden: you see which one failed, never
        what is in it.
      </span>
    );
  }
  return (
    <div className={s.strip} role="status">
      {body}
    </div>
  );
}
