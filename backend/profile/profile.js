import { PLACEMENT_DUELS } from "../leaderboard/ranking.js";

export const RECENT = 1000; // duels read for streaks, peak, rivals and the last ten
export const SERIES = 300; // points on the rating chart
export const PAGE = 12;
export const MAX_PAGE = 30;
export const FILTERS = ["all", "W", "L", "D", "U"];
export const START_RATING = 1200;

export class ProfileError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const face = (id) => id % 5; // the same five doodle faces the leaderboard uses

// "1760812200.3f2a…" -> { endedAt, id }; anything else is refused.
export function parseCursor(text) {
  const match = /^(\d{1,12})\.([0-9a-f-]{36})$/i.exec(String(text ?? ""));
  return match ? { endedAt: Number(match[1]), id: match[2] } : null;
}

// What a player sees about one duel: no ids, no emails, no hidden tests.
export function createProfile({ repo, leaderboard, bank, now = Date.now }) {
  const resultOf = (row, userId) => (row.winnerId === null ? "D" : row.winnerId === userId ? "W" : "L");

  function shape(row, userId) {
    const problem = bank.getProblem(row.problemId);
    const after = row.ratingAfter ?? row.ratingBefore;
    return {
      id: row.id,
      result: resultOf(row, userId),
      rated: row.rated,
      opponent: { username: row.oppName, face: face(row.oppId), rating: row.oppRating },
      problem: problem
        ? { title: problem.title, topic: problem.topic, difficulty: problem.difficulty }
        : { title: "A problem that has been retired", topic: null, difficulty: null },
      before: row.ratingBefore,
      after,
      delta: row.rated ? after - row.ratingBefore : 0,
      endedAt: row.endedAt * 1000,
      seconds: Math.max(0, row.endedAt - row.startedAt),
      why: row.endReason,
      _opp: row.oppId, // dropped before anything is sent
    };
  }
  const publicDuel = ({ _opp, ...duel }) => duel;

  async function summary(userId) {
    const [user, totals, rows, standing] = await Promise.all([
      repo.user(userId),
      repo.totals(userId),
      repo.recent(userId, RECENT),
      leaderboard.standingOf(userId),
    ]);
    if (!user) throw new ProfileError(404, "We couldn't find your profile.");

    const duels = rows.map((row) => shape(row, userId)); // newest first
    const rated = duels.filter((d) => d.rated);

    let current = 0;
    for (const d of rated) {
      if (d.result !== "W") break;
      current++;
    }
    let best = 0;
    let run = 0;
    for (let i = rated.length - 1; i >= 0; i--) {
      run = rated[i].result === "W" ? run + 1 : 0;
      if (run > best) best = run;
    }

    // Everything above comes from the latest RECENT duels. The start rating only counts when that is all of them.
    const complete = rows.length < RECENT;
    const ratings = [user.rating, ...rated.map((d) => d.after), ...(complete && rated.length ? [START_RATING] : [])];

    const rivals = new Map();
    for (const d of rated) {
      const rival = rivals.get(d._opp) ?? { username: d.opponent.username, face: d.opponent.face, duels: 0, W: 0, L: 0, D: 0 };
      rival.duels++;
      rival[d.result]++;
      rivals.set(d._opp, rival); // newest first, so an earlier insert is the more recent rival
    }
    const topRivals = [...rivals.values()].sort((a, b) => b.duels - a.duels).slice(0, 3);

    const played = totals.wins + totals.losses + totals.draws;
    return {
      username: user.username,
      joinedAt: user.createdAt,
      rating: user.rating,
      placing: standing?.placing ?? (user.duels < PLACEMENT_DUELS ? user.duels : null),
      placementDuels: PLACEMENT_DUELS,
      rank: standing?.rank ?? null,
      ranked: standing?.total ?? 0,
      week: { gain: standing?.week.gain ?? 0, duels: standing?.week.duels ?? 0 },
      record: { wins: totals.wins, losses: totals.losses, draws: totals.draws, rated: played },
      counts: { all: played + totals.unrated, W: totals.wins, L: totals.losses, D: totals.draws, U: totals.unrated },
      streak: { current, best },
      peak: Math.max(...ratings),
      low: Math.min(...ratings),
      last10: duels
        .slice(0, 10)
        .reverse()
        .map((d) => ({ result: d.rated ? d.result : "U", opponent: d.opponent.username, delta: d.delta })),
      spark: rated.slice(0, 15).reverse().map((d) => d.after),
      recent: duels.slice(0, 5).map(publicDuel),
      rivals: topRivals,
      now: now(),
    };
  }

  // Rating after each rated duel, oldest first. `n` is the duel's number among all their rated duels,
  // so the page can shade the placement duels. truncated = older duels exist beyond the points sent.
  async function ratingSeries(userId) {
    const [totals, rows] = await Promise.all([
      repo.totals(userId),
      repo.recent(userId, SERIES, { ratedOnly: true }),
    ]);
    const total = totals.wins + totals.losses + totals.draws;
    const chrono = rows.map((row) => shape(row, userId)).reverse();
    return {
      start: START_RATING,
      total,
      truncated: total > chrono.length,
      placementDuels: PLACEMENT_DUELS,
      points: chrono.map((d, i) => ({
        n: total - (chrono.length - 1 - i),
        t: d.endedAt,
        after: d.after,
        delta: d.delta,
        result: d.result,
        opponent: d.opponent.username,
      })),
    };
  }

  async function duels(userId, { filter = "all", cursor = null, limit = PAGE } = {}) {
    if (!FILTERS.includes(filter)) throw new ProfileError(400, "Unknown filter.");
    const size = Number.isInteger(limit) ? Math.min(Math.max(limit, 1), MAX_PAGE) : PAGE;
    let after = null;
    if (cursor) {
      after = parseCursor(cursor);
      if (!after) throw new ProfileError(400, "That page marker isn't valid.");
    }
    const rows = await repo.page(userId, filter, after, size + 1);
    const shown = rows.slice(0, size);
    const last = shown.at(-1);
    return {
      duels: shown.map((row) => publicDuel(shape(row, userId))),
      next: rows.length > size && last ? `${last.endedAt}.${last.id}` : null,
    };
  }

  async function account(userId) {
    const row = await repo.account(userId);
    if (!row) throw new ProfileError(404, "We couldn't find your account.");
    return row;
  }

  return { summary, ratingSeries, duels, account };
}
