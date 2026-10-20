import { useAuth } from "@/shared/auth/useAuth.js";
import { errorMessage } from "@/shared/api/client.js";
import HomeHeader from "@/features/home/HomeHeader.jsx";
import SolveScreen from "@/features/practice/SolveScreen.jsx";
import pageStyles from "@/features/practice/SolvePage.module.css";
import DailyBand from "./DailyBand.jsx";
import { useDaily } from "./useDaily.js";

// /daily: today's problem on the same page as Practice, with the streak above it.
export default function DailyPage() {
  const { status, daily, skew, error, reload, retry } = useDaily();
  const { user } = useAuth();

  if (status !== "ready") {
    return (
      <div className={pageStyles.page}>
        <title>Daily challenge</title>
        <meta name="robots" content="noindex" />
        <div className={pageStyles.head}>
          <HomeHeader player={{ name: user.username }} />
        </div>
        {status === "error" ? (
          <main className={pageStyles.message} role="alert">
            <h1>Couldn't load today's challenge</h1>
            <p>{errorMessage(error)}</p>
            <button type="button" className="btn btn-secondary" onClick={retry}>
              Try again
            </button>
          </main>
        ) : (
          <main className={pageStyles.message} role="status">
            <p>Loading today's challenge…</p>
          </main>
        )}
      </div>
    );
  }

  // The same problem stays mounted while the streak refreshes, so the code being typed is never lost.
  // After midnight the slug changes and the new problem opens.
  return (
    <SolveScreen
      key={daily.problem.slug}
      slug={daily.problem.slug}
      title="Daily challenge"
      band={<DailyBand daily={daily} skew={skew} />}
      onSolved={reload}
    />
  );
}
