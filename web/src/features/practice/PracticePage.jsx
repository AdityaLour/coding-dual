import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/shared/auth/useAuth.js";
import { errorMessage } from "@/shared/api/client.js";
import HomeHeader from "@/features/home/HomeHeader.jsx";
import { AppFooterLine } from "@/shared/ui/SiteFooter.jsx";
import { listProblems } from "./api.js";
import {
  EMPTY_FILTERS,
  filterProblems,
  progressBefore,
  progressOf,
  topicProgress,
} from "./logic.js";
import { readFilters, readSeen, writeFilters, writeSeen } from "./seen.js";
import ProgressBand from "./ProgressBand.jsx";
import SolvedPanel from "./SolvedPanel.jsx";
import Filters from "./Filters.jsx";
import ProblemRow from "./ProblemRow.jsx";
import s from "./PracticePage.module.css";
import rows from "./ProblemList.module.css";

// What changed since the person last looked: the starting point for the animations.
function sinceLastLook(list) {
  const seen = readSeen();
  const now = new Set(list.filter((p) => p.solved).map((p) => p.slug));
  writeSeen(now);
  return {
    before: progressBefore(list, seen ?? new Set()),
    earned: seen ? new Set([...now].filter((slug) => !seen.has(slug))) : new Set(),
  };
}

function Loaded({ list }) {
  const [filters, setFilters] = useState(readFilters);
  // Computed once per load: reading again later would find nothing new.
  const [since] = useState(() => sinceLastLook(list));
  const now = useMemo(() => progressOf(list), [list]);
  const topics = useMemo(() => topicProgress(list), [list]);
  const shown = useMemo(() => filterProblems(list, filters), [list, filters]);
  useEffect(() => writeFilters(filters), [filters]);

  return (
    <div className={s.layout}>
      <div className={s.intro}>
        <h1 className={s.h1}>
          <span>Practice</span>
        </h1>
        <p className={s.lead}>Solo problems. Nothing here changes your rating.</p>
      </div>
      <aside className={s.side} aria-label="Your progress">
        <ProgressBand now={now} before={since.before} />
        <SolvedPanel list={list} />
      </aside>
      <div className={s.main}>
        <Filters filters={filters} onChange={setFilters} topics={topics} />
        <p className={s.count} aria-live="polite">
          {shown.length} of {list.length} problems
        </p>
        {/* A new key on a new filter replays the cascade. */}
        <ul key={JSON.stringify(filters)} className={rows.rows}>
          {shown.length === 0 ? (
            <li className={rows.empty}>
              No problems match these filters.
              <button type="button" className="btn btn-secondary" onClick={() => setFilters(EMPTY_FILTERS)}>
                Clear filters
              </button>
            </li>
          ) : (
            shown.map((problem, index) => (
              <ProblemRow key={problem.slug} problem={problem} index={index} earned={since.earned.has(problem.slug)} />
            ))
          )}
        </ul>
      </div>
    </div>
  );
}

export default function PracticePage() {
  const { user } = useAuth();
  const [state, setState] = useState({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let current = true;
    listProblems().then(
      (list) => current && setState({ status: "ready", list }),
      (error) => current && setState({ status: "error", message: errorMessage(error) }),
    );
    return () => {
      current = false;
    };
  }, [attempt]);

  return (
    <div className={s.page}>
      <title>Practice</title>
      <meta name="robots" content="noindex" />
      <div className={s.head}>
        <HomeHeader player={{ name: user.username }} />
      </div>
      <main className={s.list}>
        {state.status === "ready" ? (
          <Loaded list={state.list} />
        ) : state.status === "error" ? (
          <div className={s.message} role="alert">
            <h1 className={s.h1}>Practice</h1>
            <p>{state.message}</p>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setState({ status: "loading" });
                setAttempt((n) => n + 1);
              }}
            >
              Try again
            </button>
          </div>
        ) : (
          <div className={s.message} role="status">
            <h1 className={s.h1}>Practice</h1>
            <p>Loading problems…</p>
          </div>
        )}
      </main>
      <AppFooterLine />
    </div>
  );
}
