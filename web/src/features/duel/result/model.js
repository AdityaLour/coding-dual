import { formatElapsed } from "../format.js";

// Everything the result screen shows, worked out once from the server's duelEnd, the duel we had on
// screen (null after a reload or a result we were away for) and whether this player pressed Resign.
export function buildResult(end, duel, resigned = false) {
  const won = end.result === "win";
  const lost = end.result === "loss";
  const voided = end.result === "void";
  const solved = end.reason === "solved";

  const limitMs = end.limitMs ?? (duel ? duel.problem.minutes * 60_000 : null);
  const tookMs = Math.max(
    0,
    limitMs == null
      ? (end.durationMs ?? 0)
      : Math.min(end.durationMs ?? 0, limitMs),
  );
  const took = formatElapsed(tookMs);
  const span = limitMs == null ? "" : ` of ${formatElapsed(limitMs)}`;

  let reason = "Time ran out and nobody solved it.";
  let bar = {
    label: `Nobody solved it in ${formatElapsed(limitMs ?? tookMs)}`,
    kind: "neutral",
  };
  if (voided) {
    reason = "Both players left, so the duel was called off.";
    bar = { label: `Called off at ${took}${span}`, kind: "neutral" };
  } else if (solved) {
    reason = won ? "You solved it first." : "Your rival solved it first.";
    bar = {
      label: `${won ? "You solved it in" : "Your rival solved it in"} ${took}${span}`,
      kind: won ? "you" : "opp",
    };
  } else if (end.reason === "forfeit") {
    reason = won
      ? "Your rival left the duel and did not come back."
      : resigned
        ? "You resigned."
        : "You were disconnected for too long.";
    bar = {
      label: `${won ? "Your rival left at" : "You left at"} ${took}${span}`,
      kind: "neutral",
    };
  }

  const rated = end.rated;
  const delta = rated ? end.ratingAfter - end.ratingBefore : 0;
  return {
    mode: lost ? "loss" : won ? "win" : "soft",
    headline: voided
      ? "CANCELLED"
      : won
        ? "YOU WON"
        : lost
          ? "YOU LOST"
          : "DRAW",
    reason,
    bar,
    barRatio: limitMs ? tookMs / limitMs : 0,
    rated,
    unratedReason: end.unratedReason ?? null,
    you: {
      before: end.ratingBefore,
      after: rated ? end.ratingAfter : end.ratingBefore,
      delta,
    },
    rival: {
      name: end.opponent ?? duel?.opponent ?? "Your rival",
      before: end.opponentRatingBefore,
      after: rated ? end.opponentRatingAfter : end.opponentRatingBefore,
      delta: rated ? end.opponentRatingAfter - end.opponentRatingBefore : 0,
    },
    youWon: won,
    rivalWon: lost,
    timeLeftMs: limitMs == null ? null : Math.max(0, limitMs - tookMs),
    submissions: end.submissions ?? 0,
    opponentSubmissions: end.opponentSubmissions ?? 0,
    provisional: Boolean(rated && duel?.provisional),
  };
}
