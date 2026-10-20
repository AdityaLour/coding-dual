import DoodleFace from "@/shared/ui/DoodleFace.jsx";
import { gainText, winPercent, whenText } from "./logic.js";
import { Delta, Empty, ResultTag, Skel } from "./Bits.jsx";
import s from "./Profile.module.css";

const RING = 327; // circumference of the ring (r = 52)

function Record({ summary }) {
  const { wins, losses, draws, rated } = summary.record;
  const pct = winPercent(summary.record);
  return (
    <div className={`${s.card} ${s.c5}`}>
      <h2>Record</h2>
      <div className={s.rec}>
        <div className={s.ring} role="img" aria-label={`${pct}% of rated duels won`}>
          <svg viewBox="0 0 120 120" aria-hidden="true">
            <circle className={s.rbg} cx="60" cy="60" r="52" />
            <circle
              className={s.rfg}
              cx="60"
              cy="60"
              r="52"
              strokeDasharray={RING}
              strokeDashoffset={Math.round(RING * (1 - wins / (rated || 1)))}
              style={{ "--ring": RING }}
            />
          </svg>
          <div className={s.mid}>
            <b>{pct}%</b>
            <i>won</i>
          </div>
        </div>
        <dl className={s.wld}>
          <dt>Won</dt>
          <dd>{wins}</dd>
          <dt>Lost</dt>
          <dd>{losses}</dd>
          <dt>Drawn</dt>
          <dd>{draws}</dd>
        </dl>
      </div>
      <div className={s.stk}>
        <span>
          Current streak <b>{summary.streak.current}W</b>
        </span>
        <span>
          Best streak <b>{summary.streak.best}W</b>
        </span>
      </div>
    </div>
  );
}

function Trend({ summary, onTab }) {
  const values = summary.spark;
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const path = values
    .map((v, i) => `${i ? "L" : "M"}${((i / (values.length - 1)) * 300).toFixed(1)},${(88 - ((v - lo) / (hi - lo || 1)) * 80).toFixed(1)}`)
    .join(" ");
  return (
    <div className={`${s.card} ${s.c7}`}>
      <div className={s.chead}>
        <h2>Rating, last {values.length} duels</h2>
        <button type="button" className={s.link} onClick={() => onTab("rating")}>
          Full chart
        </button>
      </div>
      {values.length > 1 ? (
        <>
          <svg className={s.spark} viewBox="0 0 300 96" preserveAspectRatio="none" role="img" aria-label={`Rating trend, now ${summary.rating}`}>
            <path d={path} />
          </svg>
          <div className={s.skmeta}>
            <span>
              Highest <b>{hi}</b>
            </span>
            <span>
              Lowest <b>{lo}</b>
            </span>
            <span>
              Now <b>{summary.rating}</b>
            </span>
          </div>
        </>
      ) : (
        <p className={s.hint}>A trend line appears after your second rated duel.</p>
      )}
    </div>
  );
}

function Recent({ summary, onTab }) {
  return (
    <div className={`${s.card} ${s.c7}`}>
      <div className={s.chead}>
        <h2>Recent duels</h2>
        <button type="button" className={s.link} onClick={() => onTab("duels")}>
          All duels
        </button>
      </div>
      <ul className={s.mini}>
        {summary.recent.map((duel) => (
          <li key={duel.id}>
            <ResultTag duel={duel} />
            <DoodleFace variant={duel.opponent.face} side="opp" size={32} className={s.face} />
            <span className={s.nm}>
              {duel.opponent.username}
              <small>{duel.problem.title}</small>
            </span>
            <Delta duel={duel} text={gainText(duel.delta)} />
            <span className={s.when}>{whenText(duel.endedAt, summary.now)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PracticeCard({ practice, onTab }) {
  return (
    <div className={`${s.card} ${s.c5}`}>
      <div className={s.chead}>
        <h2>Practice</h2>
        <button type="button" className={s.link} onClick={() => onTab("practice")}>
          Details
        </button>
      </div>
      {practice ? (
        <>
          <div className={s.big}>
            {practice.solved}
            <small> / {practice.total} solved</small>
          </div>
          <Levels by={practice.by} />
        </>
      ) : (
        <p className={s.hint}>Practice progress isn&apos;t available right now.</p>
      )}
    </div>
  );
}

export function Levels({ by }) {
  return (
    <div className={s.bars}>
      {Object.entries(by).map(([name, { solved, total }]) => (
        <div key={name} className={s.bar}>
          <span>{name}</span>
          <span className={s.tr} aria-hidden="true">
            <i style={{ transform: `scaleX(${total ? solved / total : 0})` }} />
          </span>
          <b>
            {solved}/{total}
          </b>
        </div>
      ))}
    </div>
  );
}

function Rivals({ rivals }) {
  return (
    <div className={`${s.card} ${s.c12}`}>
      <h2>Most played rivals</h2>
      <ul className={s.riv}>
        {rivals.map((rival) => (
          <li key={rival.username} className={s.rv}>
            <DoodleFace variant={rival.face} side="opp" size={40} className={s.face} />
            <div className={s.rvtext}>
              <div className={s.nm}>{rival.username}</div>
              <small>
                {rival.duels} {rival.duels === 1 ? "duel" : "duels"} · {rival.W}W {rival.L}L {rival.D}D
              </small>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function OverviewLoading() {
  return (
    <div className={s.ov} role="status" aria-label="Loading your profile">
      <Skel height={200} className={s.c5} />
      <Skel height={200} className={s.c7} />
      <Skel height={260} className={s.c7} />
      <Skel height={260} className={s.c5} />
    </div>
  );
}

export default function OverviewTab({ summary, practice, onTab }) {
  if (summary.counts.all === 0) {
    return (
      <Empty
        title="No duels yet"
        primary={{ to: "/home", label: "Find a duel" }}
        secondary={{ to: "/practice", label: "Practice first" }}
      >
        Play {summary.placementDuels} rated duels to get your rating placed. Practice problems don&apos;t count toward it.
      </Empty>
    );
  }
  return (
    <div className={s.ov}>
      {summary.record.rated > 0 ? <Record summary={summary} /> : null}
      {summary.record.rated > 0 ? <Trend summary={summary} onTab={onTab} /> : null}
      <Recent summary={summary} onTab={onTab} />
      <PracticeCard practice={practice} onTab={onTab} />
      {summary.rivals.length > 0 && <Rivals rivals={summary.rivals} />}
    </div>
  );
}
