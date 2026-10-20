// The sped-up duel in the poster. One tick is 100 ms; the loop is 15 seconds.
// Everything on screen is worked out from the tick number, so the two sides can't drift apart.

export const TICK_MS = 100;
export const CYCLE = 150;
export const SEGMENTS = 8;

const START_SECONDS = 25 * 60;
const YOU_SOLVE_TICK = 80; // the last segment fills
const SOLVED_TICK = 84; // "Solved" shows and the rival's duel ends
const RESULT_TICK = 88; // rating change appears

export function formatClock(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function demoFrame(tick) {
  const k = ((tick % CYCLE) + CYCLE) % CYCLE;
  const solved = k >= SOLVED_TICK;
  return {
    clock: formatClock(START_SECONDS - Math.floor(Math.min(k, SOLVED_TICK) * 5)),
    youSegments: k >= YOU_SOLVE_TICK ? SEGMENTS : Math.min(SEGMENTS - 1, Math.floor(k / 10)),
    rivalSegments: Math.min(6, Math.floor(Math.min(k, SOLVED_TICK) / 12.5)),
    solved,
    youWriting: k < 76,
    youChecking: k >= 76 && !solved,
    rivalWriting: !solved,
    result: k >= RESULT_TICK,
  };
}

export const segmentList = (lit) =>
  Array.from({ length: SEGMENTS }, (_, i) => ({ id: i, on: i < lit }));
