// The client's whole picture of a duel, as a pure reducer.
// Events are server messages (type "welcome", "matchFound", ...) and UI events (type "ui/..."),
// each stamped with `at` (the client's clock when it happened) so the reducer stays pure.

export const initialState = {
  me: null, // { username, rating, provisional } from the welcome
  phase: "idle", // idle | searching | found (matched, intro not yet played) | duel | ended
  note: null, // why a search stopped: cancelled | noMatch | inDuel | busy | lost
  searchStartedAt: 0,
  duel: null, // the server's duel payload (problem, opponent, endsAt, attemptsLeft, ...)
  offset: 0, // server clock minus ours, so timers agree with the server's deadline
  away: null, // { graceMs, since } while the opponent is disconnected (graceMs null after a resume)
  attempts: [], // verdicts so far this duel
  judging: false, // a submission is out with the judge
  end: null, // the duelEnd message
  resigned: false, // this player pressed Resign (the server reports it like any other forfeit)
  notice: null, // one short line for the duel screen
  syncing: false, // reconnected mid-duel and waiting for the server to say where we are
};

const LIVE = ["found", "duel"];
const searching = (state) => state.phase === "searching";
const stopSearch = (state, note) =>
  searching(state) ? { ...state, phase: "idle", note } : state;

export function reducer(state, event) {
  switch (event.type) {
    case "welcome":
      return {
        ...state,
        me: {
          username: event.username,
          rating: event.rating ?? state.me?.rating ?? null,
          provisional: event.provisional ?? false,
        },
        syncing: LIVE.includes(state.phase),
      };

    case "matchFound":
    case "duelResume": {
      const same = state.duel?.duelId === event.duelId;
      return {
        ...state,
        phase: event.type === "matchFound" ? "found" : "duel",
        duel: event,
        offset: event.now - event.at,
        away: event.opponentAway ? { graceMs: null, since: event.at } : null,
        attempts: same ? state.attempts : [],
        judging: same ? state.judging : false,
        resigned: same ? state.resigned : false,
        end: null,
        note: null,
        notice: null,
        syncing: false,
      };
    }

    case "opponentStatus":
      return {
        ...state,
        away: event.away ? { graceMs: event.graceMs, since: event.at } : null,
      };

    case "result":
      return {
        ...state,
        judging: false,
        attempts: [
          ...state.attempts,
          {
            correct: event.correct,
            verdict: event.verdict,
            failedTest: event.failedTest,
            runtimeMs: event.runtimeMs,
            at: event.at,
          },
        ],
        duel: state.duel && { ...state.duel, attemptsLeft: event.attemptsLeft },
        notice:
          event.verdict === "Judge Error"
            ? "The judge had a problem, so that attempt was not counted."
            : null,
      };

    case "duelJudge": // one of ours is already being judged (e.g. after a reconnect)
      return { ...state, judging: true, notice: null };
    case "duelFinish": // "Match Over": the duelEnd is on its way
      return { ...state, judging: false };
    case "submitError":
      return { ...state, judging: false, notice: event.message };
    case "duelError": // the server has no duel for us: ours is gone
      return { ...initialState, me: state.me, note: "lost" };

    case "duelEnd":
      return {
        ...state,
        phase: "ended",
        end: event,
        judging: false,
        away: null,
        syncing: false,
        me:
          state.me && event.rated
            ? { ...state.me, rating: event.ratingAfter }
            : state.me,
      };

    case "noMatch":
      return stopSearch(state, "noMatch");
    case "error":
      switch (event.code) {
        case "inDuel":
          return stopSearch(state, "inDuel");
        case "rateLimited":
          return searching(state)
            ? stopSearch(state, "busy")
            : { ...state, notice: "Slow down a little, then try again." };
        case "serverError": // the server puts a failed pairing back in the queue, so a search carries on
          return { ...state, notice: "Something went wrong on our side." };
        default: // alreadyQueued: the server has us queued, which is what we wanted
          return state;
      }
    // matchCancelled is only the server's ack of our own cancel; ui/cancel already handled it.

    case "ui/search":
      if (searching(state) || LIVE.includes(state.phase)) return state;
      return {
        ...initialState,
        me: state.me,
        phase: "searching",
        searchStartedAt: event.at,
      };
    case "ui/cancel":
      return stopSearch(state, "cancelled");
    case "ui/lost":
      return stopSearch(state, "lost");
    case "ui/desync": // reconnected, but the server never put us back in a duel
      return state.syncing
        ? { ...initialState, me: state.me, note: "lost" }
        : state;
    case "ui/begin": // the duel screen is up (after the Versus intro): play starts
      return state.phase === "found" ? { ...state, phase: "duel" } : state;
    case "ui/resigned":
      return { ...state, resigned: true };
    case "ui/submitted":
      return { ...state, judging: true, notice: null };
    case "ui/judgeTimeout":
      return state.judging
        ? {
            ...state,
            judging: false,
            notice: "The judge did not answer. Try submitting again.",
          }
        : state;
    case "ui/notice":
      return { ...state, notice: event.text };
    case "ui/leave": // after the result: back to a clean slate
      return { ...initialState, me: state.me };

    default:
      return state;
  }
}
