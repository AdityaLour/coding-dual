import { useEffect, useState } from "react";
import { getRank } from "./api.js";

const FRESH_MS = 60_000;
let cached = null; // { user, rank, at }: the last answer, so moving between pages does not ask again

const known = (user) => (cached && cached.user === user && Date.now() - cached.at < FRESH_MS ? cached.rank : undefined);

// Your all-time rank for the small badge in the header: a number, or null while it is unknown
// or you are not ranked yet. A failed request just means no badge.
export function useMyRank(user) {
  const [rank, setRank] = useState(() => known(user) ?? null);
  useEffect(() => {
    if (known(user) !== undefined) return undefined;
    let current = true;
    getRank().then(
      (answer) => {
        cached = { user, rank: answer.rank, at: Date.now() };
        if (current) setRank(answer.rank);
      },
      () => {},
    );
    return () => {
      current = false;
    };
  }, [user]);
  return rank;
}
