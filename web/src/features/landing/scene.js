// Everything the landing page does while you scroll, as plain numbers.
// The page reads the scroll position once per frame, asks sceneFrame what each part should look
// like, and writes the answers onto CSS custom properties. No layout is read or written in here.

export const RATING_FROM = 1200;
export const RATING_GAIN = 18;

export const clamp = (v, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
// Slow start, slow finish.
export const ease = (t) => t * t * (3 - 2 * t);

// The first act is one long pinned screen. p runs 0 to 1 along it:
//   d    the two halves of the poster slide apart (0 closed, 1 fully open)
//   bo   the three words fade in behind them
//   o    which of the three words is lit (1 lit, 0.18 dim)
export function actFrame(p) {
  const d = ease(clamp((p - 0.08) / 0.32));
  const bo = ease(clamp((p - 0.26) / 0.2));
  // The spotlight starts on the first word and ends on the last, so each is fully lit in turn.
  const spot = 0.5 + clamp((p - 0.44) / 0.48) * 2;
  const o = [0, 1, 2].map((i) =>
    clamp(1.15 - Math.abs(spot - (i + 0.5)) * 0.8, 0.18, 1),
  );
  return { d, bo, o };
}

// Small screens, short screens and reduced motion get the finished page, no pinning.
export const STATIC_ACT = { d: 0, bo: 1, o: [1, 1, 1] };

/*
  in: y (scroll position), vh (window height),  actTop, actH, stageH, pracTop, pracH,
      rateTop, finTop, finH (all in page coordinates), flat (no pinned act), calm (reduced motion).
  out: values for each part of the page.
*/
export function sceneFrame(input) {
  const { y, vh, actTop, actH, stageH, pracTop, pracH, rateTop, finTop, finH, flat, calm } = input;

  if (calm) {
    return {
      g: 0,
      act: STATIC_ACT,
      prac: 0.5,
      rate: 1,
      rating: RATING_FROM + RATING_GAIN,
      fin: 1,
    };
  }

  const span = Math.max(1, actH - stageH);
  const act = flat ? STATIC_ACT : actFrame(clamp((y - actTop) / span));
  const rate = clamp((y + vh - rateTop - vh * 0.12) / (vh * 0.65));

  return {
    g: y,
    act,
    prac: clamp((y + vh - pracTop) / (vh + pracH)),
    rate,
    rating: Math.round(RATING_FROM + RATING_GAIN * rate),
    // the closing section is short: it must finish arriving by the time the page ends
    fin: clamp((y + vh - finTop) / Math.min(vh * 0.75, finH * 0.6)),
  };
}
