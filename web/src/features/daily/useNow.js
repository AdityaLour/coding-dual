import { useEffect, useState } from "react";

// The server's idea of "now", ticking once a second. `skew` corrects a device clock that is off.
export function useServerNow(skew) {
  const [now, setNow] = useState(() => Date.now() + skew);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now() + skew), 1000);
    return () => clearInterval(timer);
  }, [skew]);
  return now;
}
