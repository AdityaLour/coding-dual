import { WALKER, PROPS } from "./scenes.js";
import s from "./Journey.module.css";

// A still version of a journey stop, shown inside the section on phones and
// with reduced motion. Same drawings as the walking version.
export default function SceneDoodle({ scene }) {
  const markup = `<g class="${s.walker} ${s[`scene_${scene}`]}">${WALKER(s)}</g>${PROPS[scene]?.(s) ?? ""}`;
  return (
    <svg
      className={`${s.still} ${s[`on_${scene}`]}`}
      viewBox="-40 -215 260 220"
      aria-hidden="true"
      // Static, trusted markup from scenes.js; never contains user data.
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}
