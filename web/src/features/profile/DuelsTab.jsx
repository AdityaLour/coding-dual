import { useState } from "react";
import DoodleFace from "@/shared/ui/DoodleFace.jsx";
import { topicName } from "../practice/topics.js";
import { clock, gainText, storyOf, whenText } from "./logic.js";
import { useDuels } from "./useDuels.js";
import { Delta, Empty, Failed, LevelTag, ResultTag, Skel } from "./Bits.jsx";
import s from "./Profile.module.css";

const FILTERS = [
  ["all", "All"],
  ["W", "Won"],
  ["L", "Lost"],
  ["D", "Drawn"],
  ["U", "Unrated"],
];

function Details({ duel, id }) {
  const topic = duel.problem.topic ? topicName(duel.problem.topic) : null;
  return (
    <div className={s.det} id={id} role="region" aria-label={`Details of your duel with ${duel.opponent.username}`}>
      <p>{storyOf(duel)}</p>
      <dl>
        <div>
          <dt>Problem</dt>
          <dd>{duel.problem.title}</dd>
        </div>
        {duel.problem.difficulty && (
          <div>
            <dt>Difficulty</dt>
            <dd>
              <LevelTag difficulty={duel.problem.difficulty} />
            </dd>
          </div>
        )}
        {topic && (
          <div>
            <dt>Topic</dt>
            <dd>{topic}</dd>
          </div>
        )}
        <div>
          <dt>Duel length</dt>
          <dd>{clock(duel.seconds)}</dd>
        </div>
        <div>
          <dt>Rival rating</dt>
          <dd>{duel.opponent.rating}</dd>
        </div>
        {duel.rated && (
          <div>
            <dt>Your rating</dt>
            <dd>
              {duel.before} → {duel.after}
            </dd>
          </div>
        )}
      </dl>
      {!duel.rated && (
        <div className={s.un}>
          This duel didn&apos;t change either rating. You and {duel.opponent.username} had already played 3 rated duels that day.
        </div>
      )}
    </div>
  );
}

function Row({ duel, open, onToggle, now }) {
  const detailId = `duel-${duel.id}`;
  const topic = duel.problem.topic ? topicName(duel.problem.topic) : null;
  return (
    <>
      <button type="button" className={s.drow} aria-expanded={open} aria-controls={open ? detailId : undefined} onClick={onToggle}>
        <ResultTag duel={duel} />
        <span className={s.op}>
          <DoodleFace variant={duel.opponent.face} side="opp" size={32} className={s.face} />
          <span>{duel.opponent.username}</span>
        </span>
        <span className={s.pb}>
          <span>{duel.problem.title}</span>
          <small>{[topic, duel.problem.difficulty].filter(Boolean).join(" · ")}</small>
        </span>
        <span className={s.dd}>
          <Delta duel={duel} text={gainText(duel.delta)} />
          {duel.rated && <small>{duel.after}</small>}
        </span>
        <span className={s.wh}>{whenText(duel.endedAt, now)}</span>
        <i className={s.chev} aria-hidden="true" />
      </button>
      {open && <Details duel={duel} id={detailId} />}
    </>
  );
}

export default function DuelsTab({ summary }) {
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState(null);
  const list = useDuels(filter);
  const label = FILTERS.find(([key]) => key === filter)[1];

  if (summary.counts.all === 0)
    return (
      <Empty title="No duels yet" primary={{ to: "/home", label: "Find a duel" }}>
        Every duel you play shows up here with the problem, the result and your rating change.
      </Empty>
    );

  const choose = (key) => {
    setFilter(key);
    setOpen(null);
  };

  return (
    <>
      <div className={s.dtop}>
        <div className={s.seg} role="group" aria-label="Filter duels">
          {FILTERS.map(([key, name]) => (
            <button key={key} type="button" aria-pressed={filter === key} onClick={() => choose(key)}>
              {name}
              <span className={s.c}>{summary.counts[key]}</span>
            </button>
          ))}
        </div>
      </div>

      {list.phase === "loading" && (
        <div role="status" aria-label="Loading your duels" className={s.skels}>
          {[0, 1, 2, 3, 4].map((n) => (
            <Skel key={n} height={60} />
          ))}
        </div>
      )}
      {list.phase === "error" && <Failed title="Couldn't load your duels" message={list.message} onRetry={list.retry} />}
      {list.phase === "ready" && list.rows.length === 0 && (
        <div className={s.empty}>
          <h3>No {label.toLowerCase()} duels</h3>
          <p>Nothing matches this filter yet.</p>
          <button type="button" className={`${s.btn} ${s.ghost}`} onClick={() => choose("all")}>
            Show all duels
          </button>
        </div>
      )}
      {list.phase === "ready" && list.rows.length > 0 && (
        <>
          <div className={s.dlist}>
            {list.rows.map((duel) => (
              <Row
                key={duel.id}
                duel={duel}
                now={summary.now}
                open={open === duel.id}
                onToggle={() => setOpen(open === duel.id ? null : duel.id)}
              />
            ))}
          </div>
          {list.hasMore && (
            <div className={s.more}>
              <button type="button" className={`${s.btn} ${s.ghost}`} onClick={list.loadMore} disabled={list.loadingMore}>
                {list.loadingMore ? "Loading…" : "Show more"}
              </button>
            </div>
          )}
          {list.moreMessage && (
            <p className={s.err} role="alert">
              {list.moreMessage}
            </p>
          )}
        </>
      )}
    </>
  );
}
