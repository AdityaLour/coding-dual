import {
  PLACEMENT_DUELS,
  TOP_N,
  WEEKLY_MIN_DUELS,
  publicEntry,
  rankAllTime,
  rankWeekly,
  standing,
  weekBounds,
} from "./ranking.js";

export const SNAPSHOT_MS = 30_000;

// Both boards come from one snapshot that is rebuilt at most every SNAPSHOT_MS, however many
// people ask. Someone's own numbers are read fresh, so they never look stale to themselves.
export function createLeaderboard({ repo, now = Date.now, snapshotMs = SNAPSHOT_MS }) {
  let snapshot = null; // { at, week, allTime, weekly }
  let building = null;

  async function build() {
    const week = weekBounds(now());
    const [all, weekRows] = await Promise.all([
      repo.allTimeRows(PLACEMENT_DUELS),
      repo.weeklyRows(week.start, week.end),
    ]);
    return { at: now(), week, allTime: rankAllTime(all), weekly: rankWeekly(weekRows) };
  }

  // One rebuild at a time: everyone who asks while it runs waits for the same one.
  async function current() {
    const week = weekBounds(now());
    if (snapshot && snapshot.week.start === week.start && now() - snapshot.at < snapshotMs) return snapshot;
    building ??= build()
      .then((built) => (snapshot = built))
      .finally(() => (building = null));
    return building;
  }

  const section = (list, userId) => ({
    total: list.length,
    entries: list.slice(0, TOP_N).map((row) => publicEntry(row, userId)),
  });

  // A player's own standing, read fresh, against the ranked lists in the snapshot.
  async function meOf(userId, snap) {
    const [user, week] = await Promise.all([
      repo.userRow(userId),
      repo.userWeek(userId, snap.week.start, snap.week.end),
    ]);
    return user ? standing(user, week, snap.allTime, snap.weekly) : null;
  }

  return {
    async board(userId) {
      const snap = await current();
      const me = await meOf(userId, snap);
      return {
        all: section(snap.allTime, userId),
        week: section(snap.weekly, userId),
        weekStartsAt: snap.week.start,
        weekEndsAt: snap.week.end,
        weeklyMinDuels: WEEKLY_MIN_DUELS,
        placementDuels: PLACEMENT_DUELS,
        generatedAt: snap.at,
        now: now(), // lets the page run the weekly countdown off the server's clock
        me,
      };
    },
    // The same standing the leaderboard shows you, plus how many people are ranked.
    async standingOf(userId) {
      const snap = await current();
      const me = await meOf(userId, snap);
      return me ? { ...me, total: snap.allTime.length } : null;
    },
    // Just the rank, for the small badge in the header: no database read beyond the snapshot.
    async rankOf(userId) {
      const snap = await current();
      return snap.allTime.find((row) => row.id === userId)?.rank ?? null;
    },
    forget() {
      snapshot = null;
    },
  };
}
