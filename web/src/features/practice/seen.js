// What the person had solved the last time they looked at the list, kept in this tab. It lets the list
// show what changed since: a tick that draws in, a counter that rolls, bars that grow. Storage can be
// missing or blocked, so every access is guarded.
import { EMPTY_FILTERS } from "./logic.js";

const SEEN = "boip:practice:seen";
const FILTERS = "boip:practice:filters";

const guard = (run, fallback) => {
  try {
    return run();
  } catch {
    return fallback;
  }
};

// -> Set of slugs, or null on a first visit in this tab.
export function readSeen() {
  const raw = guard(() => sessionStorage.getItem(SEEN), null);
  if (raw === null) return null;
  const slugs = guard(() => JSON.parse(raw), null);
  return Array.isArray(slugs) ? new Set(slugs) : null;
}
export const writeSeen = (slugs) =>
  guard(() => sessionStorage.setItem(SEEN, JSON.stringify([...slugs])));

export function readFilters() {
  const saved = guard(() => JSON.parse(sessionStorage.getItem(FILTERS)), null);
  return saved && typeof saved === "object"
    ? { ...EMPTY_FILTERS, ...saved }
    : EMPTY_FILTERS;
}
export const writeFilters = (filters) =>
  guard(() => sessionStorage.setItem(FILTERS, JSON.stringify(filters)));
