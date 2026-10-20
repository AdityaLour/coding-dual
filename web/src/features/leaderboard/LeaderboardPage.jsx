import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/shared/auth/useAuth.js";
import { usePrefersReducedMotion } from "@/shared/hooks/usePrefersReducedMotion.js";
import HomeHeader from "@/features/home/HomeHeader.jsx";
import { boardOf, footText, leadText, pinView } from "./logic.js";
import { useBoard } from "./useBoard.js";
import { readPeriod, writePeriod } from "./period.js";
import Countdown from "./Countdown.jsx";
import Podium from "./Podium.jsx";
import Rows from "./Rows.jsx";
import Standing from "./Standing.jsx";
import Pinned from "./Pinned.jsx";
import { Empty, Failed, Loading, Stale } from "./Notices.jsx";
import s from "./Leaderboard.module.css";

function Loaded({ data, skew, stale }) {
  const [period, setPeriod] = useState(readPeriod);
  const [switched, setSwitched] = useState(false); // false until the first change of board
  const [meNode, setMeNode] = useState(null);
  const [meVisible, setMeVisible] = useState(true);
  const reduceMotion = usePrefersReducedMotion();

  const board = boardOf(data, period);
  const mine = board.entries.find((e) => e.isMe);
  const me = data.me;
  const anyRanked = data.all.total > 0;

  const choose = (next) => {
    if (next === period) return;
    setPeriod(next);
    setSwitched(true);
    writePeriod(next);
  };

  // Is your own row on screen? If not, a bar at the bottom carries it. The bar leaves a little room at
  // the bottom edge, so a row hiding behind it counts as out of sight.
  useEffect(() => {
    if (!meNode) return undefined;
    const observer = new IntersectionObserver(([entry]) => setMeVisible(entry.isIntersecting), {
      rootMargin: "0px 0px -90px 0px",
      threshold: 0.9,
    });
    observer.observe(meNode);
    return () => observer.disconnect();
  }, [meNode]);
  const hidePin = Boolean(meNode) && meVisible;

  const jump = useCallback(
    () => meNode?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" }),
    [meNode, reduceMotion],
  );

  return (
    <>
      <div className={s.top}>
        <div>
          <h1 className={s.heading}>
            <span className={s.txt}>Leaderboard</span>
          </h1>
          <p className={s.lead}>{leadText(period, data.weeklyMinDuels)}</p>
        </div>
        <div className={s.ctl}>
          <div className={s.seg} role="group" aria-label="Ranking period">
            <button type="button" aria-pressed={period === "all"} onClick={() => choose("all")}>
              All-time
            </button>
            <button type="button" aria-pressed={period === "week"} onClick={() => choose("week")}>
              This week
            </button>
          </div>
          {period === "week" && <Countdown startsAt={data.weekStartsAt} endsAt={data.weekEndsAt} skew={skew} />}
        </div>
      </div>

      {stale && <Stale />}

      {/* keyed by the board, so the content under the blocks swaps with a small slide */}
      <div className={switched ? s.swap : undefined} key={`${period}-${data.generatedAt}`}>
        <Podium entries={board.entries} period={period} again={switched} />
      </div>

      <div className={s.grid}>
        <div>
          {board.entries.length === 0 ? (
            <Empty period={period} />
          ) : (
            <>
              <Rows
                entries={board.entries}
                period={period}
                intro={!switched}
                layoutKey={`${period}-${data.generatedAt}`}
                meRef={setMeNode}
              />
              <p className={s.foot}>{footText(period, board.entries.length, board.total)}</p>
            </>
          )}
        </div>
        <aside className={s.aside} aria-label="Your standing and how ranking works">
          <Standing me={me} data={data} anyRanked={anyRanked} />
          <div className={`${s.card} ${s.how}`}>
            <h2>How ranking works</h2>
            <dl>
              <dt>All-time</dt>
              <dd>Duel rating. Practice never counts.</dd>
              <dt>This week</dt>
              <dd>Rating points gained in rated duels. {data.weeklyMinDuels} duels to appear.</dd>
              <dt>Placement</dt>
              <dd>{data.placementDuels} rated duels before you show up on the board.</dd>
              <dt>Ties</dt>
              <dd>More wins first, then whoever joined earlier.</dd>
              <dt>Rematches</dt>
              <dd>The same two players get 3 rated duels a day against each other.</dd>
            </dl>
          </div>
        </aside>
      </div>

      {me && (me.placing !== null || me.rank !== null) && (
        <Pinned me={me} view={pinView(me, period, mine, board, data)} hidden={hidePin} onJump={jump} />
      )}
    </>
  );
}

export default function LeaderboardPage() {
  const { user } = useAuth();
  const { state, retry } = useBoard();
  return (
    <div>
      <title>Leaderboard</title>
      <meta name="robots" content="noindex" />
      <div className={s.head}>
        <HomeHeader player={{ name: user.username }} />
      </div>
      <main className={s.page}>
        {state.status === "ready" ? (
          <Loaded data={state.data} skew={state.skew} stale={state.stale} />
        ) : (
          <>
            <h1 className={s.heading}>
              <span className={s.txt}>Leaderboard</span>
            </h1>
            <div style={{ marginTop: 40 }}>
              {state.status === "error" ? <Failed message={state.message} onRetry={retry} /> : <Loading />}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
