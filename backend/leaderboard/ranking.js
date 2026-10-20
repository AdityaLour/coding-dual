// The rules of the leaderboard, as plain functions with no database in them.

export const PLACEMENT_DUELS = 5; // rated duels before someone appears on any board
export const WEEKLY_MIN_DUELS = 3; // rated duels this week to appear on the weekly board
export const TOP_N = 50;

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

// The weekly board runs Monday 00:00 IST to the next Monday 00:00 IST. Returns epoch milliseconds.
export function weekBounds(nowMs) {
  const shifted = new Date(nowMs + IST_OFFSET_MS); // read the IST calendar through UTC getters
  const sinceMonday = (shifted.getUTCDay() + 6) % 7;
  const mondayMidnight = Date.UTC(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth(),
    shifted.getUTCDate() - sinceMonday,
  );
  const start = mondayMidnight - IST_OFFSET_MS;
  return { start, end: start + 7 * DAY_MS };
}

// More rating, then more wins, then whoever joined first (the smaller id). Every rank is distinct.
const byRating = (a, b) => b.rating - a.rating || b.wins - a.wins || a.id - b.id;
// More points gained this week, then more wins this week, then whoever joined first.
const byGain = (a, b) => b.gain - a.gain || b.weekWins - a.weekWins || a.id - b.id;

const withRanks = (list) => list.map((row, i) => ({ ...row, rank: i + 1 }));

// rows: { id, username, rating, duels, wins, losses } for everyone with a username.
export function rankAllTime(rows) {
  return withRanks(
    rows.filter((r) => r.username && r.duels >= PLACEMENT_DUELS).sort(byRating),
  );
}

// rows: { id, username, rating, duels, gain, weekDuels, weekWins } for everyone who played this week.
export function rankWeekly(rows) {
  return withRanks(
    rows
      .filter((r) => r.username && r.duels >= PLACEMENT_DUELS && r.weekDuels >= WEEKLY_MIN_DUELS)
      .sort(byGain),
  );
}

// Nobody's id or email leaves the server. `face` picks one of the five doodle avatars.
export const publicEntry = (row, viewerId) => {
  const entry = {
    rank: row.rank,
    username: row.username,
    face: row.id % 5,
    rating: row.rating,
    isMe: row.id === viewerId,
  };
  if (row.gain === undefined) {
    entry.wins = row.wins;
    entry.losses = row.losses;
    entry.duels = row.duels;
  } else {
    entry.gain = row.gain;
    entry.weekDuels = row.weekDuels;
  }
  return entry;
};

// What the person sees about themselves. `user` is their own row, `week` their numbers this week
// (null when they played nothing), `allTime` and `weekly` the two ranked lists.
export function standing(user, week, allTime, weekly) {
  const mine = allTime.find((r) => r.id === user.id);
  const myWeek = weekly.find((r) => r.id === user.id);
  const above = mine && mine.rank > 1 ? allTime[mine.rank - 2] : null;
  return {
    username: user.username,
    rating: user.rating,
    duels: user.duels,
    placing: user.duels < PLACEMENT_DUELS ? user.duels : null,
    rank: mine?.rank ?? null,
    wins: mine?.wins ?? null,
    losses: mine?.losses ?? null,
    next: above
      ? { username: above.username, rank: above.rank, points: above.rating - user.rating + 1 }
      : null,
    week: {
      rank: myWeek?.rank ?? null,
      gain: week?.gain ?? 0,
      duels: week?.weekDuels ?? 0,
      qualified: Boolean(myWeek),
    },
  };
}
