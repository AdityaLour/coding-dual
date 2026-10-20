import { Link } from "react-router";
import { useMediaQuery } from "@/shared/hooks/useMediaQuery.js";
import { solvedProblems, timeAgo } from "./logic.js";
import { topicName } from "./topics.js";
import s from "./SolvedPanel.module.css";

function Items({ solved }) {
  if (solved.length === 0)
    return <p className={s.empty}>Problems you solve will show up here.</p>;
  return (
    <ul className={s.items}>
      {solved.map((problem) => (
        <li key={problem.slug}>
          <Link to={`/practice/${problem.slug}`} className={s.item}>
            <span className={s.title}>{problem.title}</span>
            <span className={s.meta}>
              {topicName(problem.topic)} · {problem.difficulty} · {problem.rating}
            </span>
            {problem.solvedAt ? <span className={s.when}>{timeAgo(problem.solvedAt)}</span> : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}

// Everything the person has solved, newest first. Beside the list on a wide screen;
// tucked into a fold-out on a narrow one, where the list itself needs the room.
export default function SolvedPanel({ list }) {
  const wide = useMediaQuery("(min-width: 1100px)");
  const solved = solvedProblems(list);

  if (!wide)
    return (
      <details className={s.fold}>
        <summary>Solved problems ({solved.length})</summary>
        <Items solved={solved} />
      </details>
    );
  return (
    <section className={s.panel} aria-label="Solved problems">
      <h2 className={s.heading}>
        Solved <span>{solved.length}</span>
      </h2>
      <Items solved={solved} />
    </section>
  );
}
