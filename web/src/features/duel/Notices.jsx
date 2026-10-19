import { useEffect, useState } from "react";
import { useRealtime } from "@/shared/realtime/useRealtime.js";
import { useDuel } from "./duelContext.js";
import { formatClock } from "./format.js";
import s from "./Notices.module.css";

// What a closed connection means, in words. "open" and "connecting" (just arrived) need none.
const CONNECTION = {
  reconnecting: "Connection lost. Reconnecting…",
  stopped: "Connection closed after too many messages. Reload the page.",
};

// The strip under the header: your own connection first (it matters more), then your rival's.
export default function Notices() {
  const { status, takeOver } = useRealtime();
  const { away, duel } = useDuel();

  if (status === "replaced") {
    return (
      <div className={s.strip} role="status">
        <span>Boip is open in another tab, so this one is paused.</span>
        <button type="button" onClick={takeOver}>
          Use this tab
        </button>
      </div>
    );
  }
  if (CONNECTION[status]) {
    return (
      <div className={`${s.strip} ${s.warn}`} role="status">
        <span>{CONNECTION[status]}</span>
      </div>
    );
  }
  if (away) return <RivalAway name={duel.opponent} away={away} />;
  return null;
}

// The rival's grace time, counting down. After a resume the time left is not known, so there is no number.
function RivalAway({ name, away }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (away.graceMs == null) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, [away.graceMs]);

  const left =
    away.graceMs == null
      ? null
      : Math.max(0, away.graceMs - (now - away.since));
  return (
    <div className={s.strip} role="status">
      <span>
        {name} lost connection. They have{" "}
        {left == null ? (
          "a short time"
        ) : (
          <b className={s.num}>{formatClock(left)}</b>
        )}{" "}
        to come back, then you win.
      </span>
    </div>
  );
}
