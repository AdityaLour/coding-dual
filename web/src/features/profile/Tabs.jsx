import { useEffect, useLayoutEffect, useRef } from "react";
import { TABS } from "./logic.js";
import s from "./Profile.module.css";

const LABELS = { overview: "Overview", rating: "Rating", duels: "Duels", practice: "Practice", account: "Account" };

// The red slash under the chosen tab. Written straight to the element so moving it never re-renders anything.
function place(list, indicator) {
  const chosen = list.querySelector('[aria-selected="true"]');
  if (!chosen) return;
  indicator.style.width = `${Math.max(34, chosen.offsetWidth - 12)}px`;
  indicator.style.transform = `translateX(${chosen.offsetLeft + 6}px) skewX(-20deg)`;
  // On a narrow screen the row scrolls sideways: keep the chosen tab in view.
  const left = chosen.offsetLeft - 16;
  const right = chosen.offsetLeft + chosen.offsetWidth + 16;
  if (left < list.scrollLeft) list.scrollLeft = left;
  else if (right > list.scrollLeft + list.clientWidth) list.scrollLeft = right - list.clientWidth;
}

// counts: a small number shown beside a tab name, e.g. { duels: 54 }.
export default function Tabs({ tab, onChange, counts }) {
  const list = useRef(null);
  const indicator = useRef(null);
  const first = useRef(true);

  useLayoutEffect(() => {
    place(list.current, indicator.current);
    // No slide on the first paint: the slash simply starts under the right tab.
    if (first.current) {
      first.current = false;
      requestAnimationFrame(() => indicator.current?.setAttribute("data-ready", ""));
    }
  }, [tab]);

  // A badge arriving or a font loading changes tab widths, so measure again then.
  useEffect(() => {
    const redo = () => place(list.current, indicator.current);
    const observer = new ResizeObserver(redo);
    observer.observe(list.current);
    for (const child of list.current.children) observer.observe(child);
    document.fonts?.ready.then(redo);
    return () => observer.disconnect();
  }, []);

  function onKeyDown(event) {
    const at = TABS.indexOf(tab);
    const to = { ArrowRight: (at + 1) % TABS.length, ArrowLeft: (at - 1 + TABS.length) % TABS.length, Home: 0, End: TABS.length - 1 }[event.key];
    if (to === undefined) return;
    event.preventDefault();
    onChange(TABS[to]);
    list.current.querySelector(`[data-tab="${TABS[to]}"]`)?.focus();
  }

  return (
    <div className={s.tabsw}>
      <div ref={list} className={s.tabs} role="tablist" aria-label="Profile sections" onKeyDown={onKeyDown}>
        {TABS.map((name) => (
          <button
            key={name}
            type="button"
            role="tab"
            id={`tab-${name}`}
            data-tab={name}
            aria-selected={tab === name}
            aria-controls={`panel-${name}`}
            tabIndex={tab === name ? 0 : -1}
            className={s.tab}
            onClick={() => onChange(name)}
          >
            {LABELS[name]}
            {counts[name] !== undefined && <span className={s.n}>{counts[name]}</span>}
          </button>
        ))}
        <i ref={indicator} className={s.ind} aria-hidden="true" />
      </div>
    </div>
  );
}
