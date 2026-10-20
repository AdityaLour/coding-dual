// Which board the person last looked at, kept in this tab. Storage can be missing or blocked.
const KEY = "boip:leaderboard:period";

export function readPeriod() {
  try {
    return sessionStorage.getItem(KEY) === "week" ? "week" : "all";
  } catch {
    return "all";
  }
}

export function writePeriod(period) {
  try {
    sessionStorage.setItem(KEY, period);
  } catch {
    /* a missing or full store only means the choice is not remembered */
  }
}
