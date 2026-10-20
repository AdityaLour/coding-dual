import crypto from "node:crypto";

// The daily challenge runs on Indian time (IST, UTC+5:30, no daylight saving). A "day" is a whole
// number: how many IST days have passed since 1970-01-01 there. The SQL in repo.js uses the same maths.
export const IST_OFFSET_MS = 19_800_000; // 5 h 30 min
const DAY_MS = 86_400_000;

export const istDay = (ms) => Math.floor((ms + IST_OFFSET_MS) / DAY_MS);

// The moment the given day ends (and the next one begins), as epoch milliseconds.
export const dayEndsAt = (day) => (day + 1) * DAY_MS - IST_OFFSET_MS;

// "2026-10-20" for a day number.
export const dayDate = (day) => new Date(day * DAY_MS).toISOString().slice(0, 10);

// 0 = Monday ... 6 = Sunday. Day 0 (1970-01-01) was a Thursday.
export const weekdayOf = (day) => (((day + 3) % 7) + 7) % 7;

// Today's pick among the problems, spread evenly and the same for everyone.
// `ids` must be sorted, so two servers (or a restart) agree.
export function pickId(day, ids) {
  if (ids.length === 0) return null;
  const hash = crypto.createHash("sha256").update(`daily:${day}`).digest();
  return ids[hash.readUInt32BE(0) % ids.length];
}

// How many days in a row ending today (or yesterday, if today is not solved yet) have a solve.
// Today unsolved does not break the streak until the day is over.
export function streaks(solved, today) {
  let current = 0;
  let day = solved.has(today) ? today : today - 1;
  while (solved.has(day)) {
    current++;
    day--;
  }
  let longest = 0;
  let run = 0;
  let previous = null;
  for (const d of [...solved].sort((a, b) => a - b)) {
    run = previous !== null && d === previous + 1 ? run + 1 : 1;
    if (run > longest) longest = run;
    previous = d;
  }
  return { current, longest };
}
