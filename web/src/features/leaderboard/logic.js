// The plain rules behind the leaderboard screens. No React in here, so they can be tested directly.
// The server sends { all, week, me, weekStartsAt, weekEndsAt, now, placementDuels, weeklyMinDuels }.
// A board is { total, entries }; an all-time entry is { rank, username, face, rating, isMe, wins, losses, duels },
// a weekly one { rank, username, face, rating, isMe, gain, weekDuels }.

export const PERIODS = ["all", "week"];

// "+96", "−12" (a real minus sign) or "0".
export const gainText = (n) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : "0");

const pad = (n) => String(n).padStart(2, "0");

// Milliseconds left -> { d, h, m, s }, never negative.
export function countdown(msLeft) {
  const left = Math.max(0, Math.floor(msLeft / 1000));
  return {
    d: Math.floor(left / 86400),
    h: Math.floor((left % 86400) / 3600),
    m: Math.floor((left % 3600) / 60),
    s: left % 60,
  };
}
export const countdownText = ({ d, h, m, s }) => `${d}d ${pad(h)}h ${pad(m)}m ${pad(s)}s`;

// How much of the week has passed, 0 to 1.
export const weekFraction = (now, start, end) =>
  Math.min(1, Math.max(0, (now - start) / (end - start)));

export const leadText = (period, weeklyMin) =>
  period === "all"
    ? "Ranked by duel rating. Only rated duels count; practice never changes it."
    : `Rating points gained in rated duels since Monday. You need ${weeklyMin} duels this week to appear.`;

export const footText = (period, shown, total) =>
  `Top ${shown} of ${total} ranked${period === "week" ? " this week" : ""}. Updates about once a minute.`;

export const boardOf = (data, period) => (period === "week" ? data.week : data.all);

// What the pinned "you" bar says, for the period on screen. `mine` is your row in that list, if it is there.
export function pinView(me, period, mine, board, data) {
  if (me.placing !== null) {
    return {
      rank: `${me.placing}/${data.placementDuels}`,
      sub: `${data.placementDuels - me.placing} more rated duels to join the board`,
      value: null,
      canJump: false,
    };
  }
  if (period === "all") {
    return {
      rank: `#${me.rank}`,
      sub: mine ? `${mine.wins}–${mine.losses}` : `of ${board.total} ranked`,
      value: String(me.rating),
      canJump: Boolean(mine),
    };
  }
  if (mine) {
    return { rank: `#${mine.rank}`, sub: `${mine.weekDuels} duels this week`, value: gainText(mine.gain), canJump: true };
  }
  if (me.week.qualified) {
    return { rank: `#${me.week.rank}`, sub: `of ${board.total} this week`, value: gainText(me.week.gain), canJump: false };
  }
  return {
    rank: "–",
    sub: `not ranked this week, ${me.week.duels} of ${data.weeklyMinDuels} duels`,
    value: null,
    canJump: false,
  };
}
