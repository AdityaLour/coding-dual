import { Link, useNavigate } from "react-router";
import { topicName } from "./topics.js";
import s from "./ProblemList.module.css";

const TICK = (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 10.5l4 4 8-9" />
  </svg>
);

function Mark({ problem, earned }) {
  if (problem.solved)
    return (
      <span className={`${s.mark} ${earned ? s.earned : ""}`} role="img" aria-label="Solved">
        {TICK}
      </span>
    );
  return (
    <span className={s.mark} role="img" aria-label={problem.attempts > 0 ? "Tried, not solved" : "Not tried"}>
      <span className={`${s.dot} ${problem.attempts > 0 ? s.tried : ""}`} />
    </span>
  );
}

// One problem in the list. Opening it hands the title's position to the next page, which
// flies the title into its heading.
export default function ProblemRow({ problem, index, earned }) {
  const navigate = useNavigate();
  const to = `/practice/${problem.slug}`;

  function open(event) {
    const plain =
      event.button === 0 && !(event.metaKey || event.ctrlKey || event.shiftKey || event.altKey);
    if (!plain) return; // new tab, new window: let the link do its normal thing
    event.preventDefault();
    const title = event.currentTarget.querySelector("[data-title]");
    const box = title.getBoundingClientRect();
    navigate(to, { state: { flight: { left: box.left, top: box.top, text: title.textContent } } });
  }

  return (
    <li>
      <Link to={to} className={s.row} style={{ "--i": index }} onClick={open}>
        <Mark problem={problem} earned={earned} />
        <span className={s.title} data-title>{problem.title}</span>
        <span className={s.meta}>
          <span className={s.topic}>{topicName(problem.topic)}</span>
          <span className={s.diff}>{problem.difficulty}</span>
        </span>
        <span className={s.rating}>{problem.rating}</span>
      </Link>
    </li>
  );
}
