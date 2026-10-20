import { dayDate, dayEndsAt, istDay, pickId, streaks, weekdayOf } from "./days.js";

// Don't repeat a problem within this many days (less, if the bank is small).
const NO_REPEAT_DAYS = 60;

export class DailyError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// One problem for everyone each IST day, and a streak for each player.
//   repo - { get(day), insertIgnore(day, id), recentProblemIds(n), solvedDays(userId) }
//   bank - { getProblem(id), problemIds() }
export function createDaily({ repo, bank, now = Date.now }) {
  let cached = null; // { day, problemId }: today's pick, so most requests never touch the table

  async function problemIdFor(day) {
    if (cached?.day === day) return cached.problemId;
    let id = await repo.get(day);
    if (id === null) {
      const ids = bank.problemIds();
      const skip = new Set(await repo.recentProblemIds(Math.min(NO_REPEAT_DAYS, ids.length - 1)));
      const fresh = ids.filter((candidate) => !skip.has(candidate));
      await repo.insertIgnore(day, pickId(day, fresh.length > 0 ? fresh : ids));
      id = await repo.get(day); // the row another request wrote first, if there was one
    }
    cached = { day, problemId: id };
    return id;
  }

  async function today(userId) {
    const day = istDay(now());
    const problem = bank.getProblem(await problemIdFor(day));
    if (!problem) throw new DailyError(503, "Today's problem isn't available. Try again later.");
    const solved = new Set(await repo.solvedDays(userId));
    const weekStart = day - weekdayOf(day);
    return {
      now: now(), // the server's clock, so the page's countdown is right even if the device's is off
      date: dayDate(day),
      resetsAt: dayEndsAt(day),
      problem: {
        slug: problem.slug,
        title: problem.title,
        topic: problem.topic,
        rating: problem.rating,
        difficulty: problem.difficulty,
      },
      solvedToday: solved.has(day),
      streak: streaks(solved, day),
      // Monday to Sunday of this week: was the daily solved, and which square is today.
      week: {
        today: weekdayOf(day),
        solved: Array.from({ length: 7 }, (_, i) => solved.has(weekStart + i)),
      },
    };
  }

  return { today };
}
