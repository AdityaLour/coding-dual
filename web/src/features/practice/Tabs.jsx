import { useLayoutEffect, useRef } from "react";
import s from "./ResultPanel.module.css";

// Two tabs with an underline that slides between them.
export default function Tabs({ tabs, value, onChange }) {
  const list = useRef(null);
  const line = useRef(null);

  useLayoutEffect(() => {
    const place = () => {
      const chosen = list.current?.querySelector('[aria-selected="true"]');
      if (!chosen || !line.current) return;
      line.current.style.transform = `translateX(${chosen.offsetLeft}px) scaleX(${chosen.offsetWidth / 100})`;
    };
    place();
    const watch = new ResizeObserver(place);
    watch.observe(list.current);
    return () => watch.disconnect();
  }, [value, tabs]);

  return (
    <div className={s.tabs} role="tablist" ref={list}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={tab.id === value}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
          {tab.note ? <span className={s.tabNote}>{tab.note}</span> : null}
        </button>
      ))}
      <span ref={line} className={s.line} aria-hidden="true" />
    </div>
  );
}
