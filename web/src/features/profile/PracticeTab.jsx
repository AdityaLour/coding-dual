import { Link } from "react-router";
import { topicName } from "../practice/topics.js";
import { timeAgo } from "../practice/logic.js";
import { Empty, Failed, LevelTag, Skel } from "./Bits.jsx";
import { Levels } from "./OverviewTab.jsx";
import s from "./Profile.module.css";

export default function PracticeTab({ summary, state, retry }) {
  if (state.status === "error")
    return <Failed title="Couldn't load your practice progress" message={state.message} onRetry={retry} />;
  if (!summary)
    return (
      <div className={s.pg}>
        <Skel height={520} />
        <Skel height={520} />
      </div>
    );

  const none = summary.solved === 0;
  return (
    <div className={s.pg}>
      <div className={s.stack}>
        <div className={s.card}>
          <h2>Solved by topic</h2>
          <ul className={s.tp}>
            {summary.topics.map((topic) => (
              <li key={topic.slug} data-zero={topic.solved === 0 || undefined}>
                <span>{topicName(topic.slug)}</span>
                <span className={s.tr} aria-hidden="true">
                  <i style={{ transform: `scaleX(${topic.total ? topic.solved / topic.total : 0})` }} />
                </span>
                <b>
                  {topic.solved}/{topic.total}
                </b>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className={s.stack}>
        <div className={s.card}>
          <h2>Overall</h2>
          <div className={s.big}>
            {summary.solved}
            <small> / {summary.total}</small>
          </div>
          <Levels by={summary.by} />
          <div className={s.kpis}>
            <div>
              <small>Submissions</small>
              <b>{summary.submissions}</b>
            </div>
            <div>
              <small>Problems tried</small>
              <b>{summary.attempted}</b>
            </div>
            <div>
              <small>Solved this week</small>
              <b>{summary.thisWeek}</b>
            </div>
          </div>
        </div>
        <div className={s.card}>
          <div className={s.chead}>
            <h2>Recently solved</h2>
          </div>
          {none ? (
            <Empty title="Nothing solved yet" primary={{ to: "/practice", label: "Open practice" }}>
              Problems you solve show up here.
            </Empty>
          ) : (
            <ul className={s.mini}>
              {summary.recent.map((problem) => (
                <li key={problem.slug}>
                  <span className={s.nm}>
                    <Link className={s.plainLink} to={`/practice/${problem.slug}`}>
                      {problem.title}
                    </Link>
                    <small>
                      {problem.attempts} {problem.attempts === 1 ? "attempt" : "attempts"}
                    </small>
                  </span>
                  <LevelTag difficulty={problem.difficulty} />
                  <span className={s.when}>{problem.solvedAt ? timeAgo(problem.solvedAt) : ""}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <Link className={`${s.btn} ${s.self}`} to="/practice">
          Keep practising
        </Link>
      </div>
    </div>
  );
}
