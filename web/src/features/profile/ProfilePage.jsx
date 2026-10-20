import { useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router";
import { useAuth } from "@/shared/auth/useAuth.js";
import { usePrefersReducedMotion } from "@/shared/hooks/usePrefersReducedMotion.js";
import HomeHeader from "@/features/home/HomeHeader.jsx";
import { listProblems } from "@/features/practice/api.js";
import { getAccount, getProfile, getRating } from "./api.js";
import { practiceSummary, tabOf } from "./logic.js";
import { useLoad } from "./useLoad.js";
import { Identity, FormStrip } from "./Identity.jsx";
import Tabs from "./Tabs.jsx";
import OverviewTab, { OverviewLoading } from "./OverviewTab.jsx";
import RatingTab from "./RatingTab.jsx";
import DuelsTab from "./DuelsTab.jsx";
import PracticeTab from "./PracticeTab.jsx";
import AccountTab from "./account/AccountTab.jsx";
import { Failed, Skel } from "./Bits.jsx";
import s from "./Profile.module.css";

const TITLES = { overview: "Profile", rating: "Rating", duels: "Duels", practice: "Practice", account: "Account" };

export default function ProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const tab = tabOf(useParams().tab);

  // The summary and the practice list load at once (the header, badges and Overview need both);
  // the rest load the first time their tab is opened and then stay.
  const profile = useLoad(getProfile);
  const problems = useLoad(listProblems);
  const rating = useLoad(getRating, tab === "rating");
  const account = useLoad(getAccount, tab === "account");

  const practice = useMemo(
    () => (problems.state.status === "ready" ? practiceSummary(problems.state.data) : null),
    [problems.state],
  );
  const summary = profile.state.status === "ready" ? profile.state.data : null;

  const choose = useCallback(
    (next) => navigate(next === "overview" ? "/profile" : `/profile/${next}`),
    [navigate],
  );

  // The links inside Overview cards open another tab; take the reader back to the top of it.
  const reduceMotion = usePrefersReducedMotion();
  const jump = useCallback(
    (next) => {
      choose(next);
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    },
    [choose, reduceMotion],
  );

  const counts = {
    duels: summary ? summary.counts.all : undefined,
    practice: practice ? practice.solved : undefined,
  };

  return (
    <div>
      <title>{`${TITLES[tab]}`}</title>
      <meta name="robots" content="noindex" />
      <div className={s.head}>
        <HomeHeader player={{ name: user.username }} />
      </div>
      <main className={s.page}>
        <Identity username={user.username} state={profile.state} />
        {summary && <FormStrip summary={summary} />}
        <Tabs tab={tab} onChange={choose} counts={counts} />
        <section key={tab} className={s.panel} role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} tabIndex={0}>
          {profile.state.status === "error" && tab !== "account" ? (
            <Failed title="Couldn't load your profile" message={`${profile.state.message} Your rating and results are safe.`} onRetry={profile.retry} />
          ) : tab === "account" ? (
            <AccountTab username={user.username} state={account.state} retry={account.retry} />
          ) : !summary ? (
            tab === "overview" ? <OverviewLoading /> : <Skel height={420} />
          ) : tab === "overview" ? (
            <OverviewTab summary={summary} practice={practice} onTab={jump} />
          ) : tab === "rating" ? (
            <RatingTab summary={summary} series={rating.state} retry={rating.retry} />
          ) : tab === "duels" ? (
            <DuelsTab summary={summary} />
          ) : (
            <PracticeTab summary={practice} state={problems.state} retry={problems.retry} />
          )}
        </section>
      </main>
    </div>
  );
}
