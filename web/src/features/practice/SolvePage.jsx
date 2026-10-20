import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { ApiError, errorMessage } from "@/shared/api/client.js";
import { useAuth } from "@/shared/auth/useAuth.js";
import HomeHeader from "@/features/home/HomeHeader.jsx";
import { getProblem } from "./api.js";
import SolveView from "./SolveView.jsx";
import s from "./SolvePage.module.css";

// What to say when the problem cannot be shown.
function refusal(error) {
  if (error instanceof ApiError && error.status === 404)
    return { title: "No such problem", text: "That problem does not exist.", link: ["/practice", "Back to Practice"] };
  if (error instanceof ApiError && error.status === 409)
    return { title: "Finish your duel first", text: "Practice opens again when your duel ends.", link: ["/duel", "Back to your duel"] };
  return { title: "Couldn't load the problem", text: errorMessage(error), link: null };
}

export default function SolvePage() {
  const { slug } = useParams();
  const { user } = useAuth();
  const [state, setState] = useState({ slug: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let current = true;
    getProblem(slug).then(
      (problem) => current && setState({ slug, problem }),
      (error) => current && setState({ slug, error }),
    );
    return () => {
      current = false;
    };
  }, [slug, attempt]);

  // An answer for another problem (the person moved on) is not this one's answer.
  const ready = state.slug === slug ? state : null;

  return (
    <div className={s.page}>
      <title>{ready?.problem ? `${ready.problem.title} — Boip` : "Practice — Boip"}</title>
      <meta name="robots" content="noindex" />
      <div className={s.head}>
        <HomeHeader player={{ name: user.username }} />
      </div>
      {ready?.problem ? (
        <SolveView key={slug} problem={ready.problem} />
      ) : ready?.error ? (
        <main className={s.message} role="alert">
          <h1>{refusal(ready.error).title}</h1>
          <p>{refusal(ready.error).text}</p>
          {refusal(ready.error).link ? (
            <Link className="btn btn-secondary" to={refusal(ready.error).link[0]}>
              {refusal(ready.error).link[1]}
            </Link>
          ) : (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setState({ slug: null });
                setAttempt((n) => n + 1);
              }}
            >
              Try again
            </button>
          )}
        </main>
      ) : (
        <main className={s.message} role="status">
          <p>Loading the problem…</p>
        </main>
      )}
    </div>
  );
}
