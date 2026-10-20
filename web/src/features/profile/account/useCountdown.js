import { useEffect, useState } from "react";

// Counts a number of seconds down to 0. start(n) begins again; the number is what to show.
export function useCountdown() {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    if (left <= 0) return undefined;
    const timer = setTimeout(() => setLeft(left - 1), 1000);
    return () => clearTimeout(timer);
  }, [left]);
  return [left, setLeft];
}
