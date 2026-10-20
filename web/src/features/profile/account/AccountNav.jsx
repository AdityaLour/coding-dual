import { useLayoutEffect, useRef } from "react";
import s from "./Account.module.css";

// The list down the left side. A slanted bar slides to the section you are in.
export default function AccountNav({ sections, active, onGo }) {
  const list = useRef(null);
  const bar = useRef(null);

  useLayoutEffect(() => {
    const link = list.current.querySelector('[aria-current="true"]');
    if (!link) return;
    bar.current.style.transform = `translateY(${link.offsetTop}px)`;
    bar.current.style.height = `${link.offsetHeight}px`;
  }, [active]);

  return (
    <nav className={s.anav} aria-label="Account sections" ref={list}>
      <i ref={bar} className={s.abar} aria-hidden="true" />
      {sections.map(({ id, label }) => (
        <a
          key={id}
          href={`#acct-${id}`}
          aria-current={active === id}
          onClick={(event) => {
            event.preventDefault();
            onGo(id);
          }}
        >
          {label}
        </a>
      ))}
    </nav>
  );
}
