import { useState } from "react";
import { useMediaQuery } from "@/shared/hooks/useMediaQuery.js";
import { useDuel } from "./duelContext.js";
import ArenaHeader from "./ArenaHeader.jsx";
import Notices from "./Notices.jsx";
import ProblemPane from "./ProblemPane.jsx";
import CodePane from "./CodePane.jsx";
import s from "./Arena.module.css";

const PHONE = "(max-width: 599px)"; // keep in step with the @media rules in the duel stylesheets

// The duel itself. On a phone the problem and the editor are two tabs; anywhere wider they are both
// on screen (side by side, or the problem above the editor on a tall tablet), chosen by CSS alone.
// `revealed` is false while the Versus intro is still playing; `leaving` while the finish plays.
export default function Arena({ setSlot, revealed, leaving }) {
  const { duel } = useDuel();
  const phone = useMediaQuery(PHONE);
  const [tab, setTab] = useState("problem");

  const panel = (name) =>
    phone
      ? {
          role: "tabpanel",
          id: `${name}-panel`,
          "aria-labelledby": `${name}-tab`,
        }
      : { id: `${name}-panel` };
  const hide = (name) => (phone && tab !== name ? s.off : "");

  return (
    <div
      className={`${s.arena} ${revealed ? "" : s.waiting} ${leaving ? s.leaving : ""}`}
      inert={!revealed || leaving}
    >
      <ArenaHeader setSlot={setSlot} revealed={revealed} />
      <Notices />
      {phone && (
        <div className={s.tabs} role="tablist" aria-label="Duel panels">
          {["problem", "code"].map((name) => (
            <button
              key={name}
              type="button"
              role="tab"
              id={`${name}-tab`}
              aria-controls={`${name}-panel`}
              aria-selected={tab === name}
              className={s.tab}
              onClick={() => setTab(name)}
            >
              {name === "problem" ? "Problem" : "Code"}
            </button>
          ))}
        </div>
      )}
      <main className={s.body}>
        <ProblemPane
          className={`${s.problem} ${s.rise} ${hide("problem")}`}
          showWrite={phone}
          onWrite={() => setTab("code")}
          {...panel("problem")}
        />
        <CodePane
          key={duel.duelId}
          className={`${s.code} ${s.rise2} ${hide("code")}`}
          {...panel("code")}
        />
      </main>
    </div>
  );
}
