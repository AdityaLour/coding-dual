// Clock maths for the daily challenge. Pure, so it is easy to test.

// "HHMMSS" for the time left, never below zero. A day is the longest it can be.
export function clockDigits(msLeft) {
  const total = Math.max(0, Math.ceil(msLeft / 1000));
  return [Math.min(99, Math.floor(total / 3600)), Math.floor(total / 60) % 60, total % 60]
    .map((n) => String(n).padStart(2, "0"))
    .join("");
}

export const clockText = (digits) => `${digits.slice(0, 2)}:${digits.slice(2, 4)}:${digits.slice(4)}`;

// How far the device's clock is behind the server's (negative: ahead). Add it to Date.now().
export const skewOf = (serverNow, localNow) => serverNow - localNow;

// When to ask the server again after the day ends: a moment after, never in a tight loop.
export const refreshDelay = (resetsAt, serverNow) => Math.max(0, resetsAt - serverNow) + 2000;

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// "2026-10-21" -> "Wed 21 Oct" (the date is already the IST date, so no time zone is applied).
export function dateLabel(date) {
  const d = new Date(`${date}T00:00:00Z`);
  return `${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

export const daysText = (n) => (n === 1 ? "1 day" : `${n} days`);
