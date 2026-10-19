// "1200", "1200, provisional", or "Unranked" when the server sent no rating.
export const formatRating = (rating, provisional) =>
  rating == null
    ? "Unranked"
    : provisional
      ? `${rating}, provisional`
      : String(rating);

const clock = (seconds) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

// Milliseconds -> "m:ss", rounded up so a countdown never shows 0:00 with time left.
export const formatClock = (ms) => clock(Math.max(0, Math.ceil(ms / 1000)));

// Milliseconds -> "m:ss", rounded down: how long something took.
export const formatElapsed = (ms) => clock(Math.max(0, Math.floor(ms / 1000)));

// A rating change: "+23", "−17" (a real minus sign), or "0".
export const formatDelta = (delta) =>
  delta > 0 ? `+${delta}` : delta < 0 ? `−${-delta}` : "0";
