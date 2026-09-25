// SVG markup for the journey: your walker and the props at each stop.
// Coordinates are relative to a stop, with the walker's feet at (0, 0).
// Static, trusted strings: they never contain user data.

export const WALKER = (s) => `
<g class="${s.flipper}"><g class="${s.dancer}">
  <rect class="${s.hit}" x="-30" y="-150" width="60" height="150" fill="transparent"/>
  <g class="${s.ln}" stroke="var(--you)" stroke-width="5">
    <circle cx="0" cy="-118" r="16" fill="var(--bg)"/>
    <path d="M-17 -118 C-17 -142 17 -142 17 -118" stroke="var(--opp)" stroke-width="4"/>
    <rect x="-22" y="-124" width="7" height="13" rx="3.5" fill="var(--opp)" stroke="none"/>
    <rect x="15" y="-124" width="7" height="13" rx="3.5" fill="var(--opp)" stroke="none"/>
    <circle cx="5" cy="-120" r="1.6" fill="var(--you)" stroke="none"/>
    <path d="M0 -102 L0 -46"/>
    <path class="${s.legA}" d="M0 -46 L-15 0 M0 -46 L15 0"/>
    <path class="${s.legB}" d="M0 -46 L-5 0 M0 -46 L6 0"/>
    <g class="${s.armsWalk}"><path d="M0 -84 L-16 -58 M0 -84 L16 -60"/></g>
    <g class="${s.pose} ${s.pType}"><g class="${s.hands}"><path d="M0 -84 L22 -64 L34 -66 M0 -84 L18 -60 L30 -58"/></g></g>
    <g class="${s.pose} ${s.pFive}"><path d="M0 -84 L20 -112 L26 -126 M0 -84 L-14 -58"/></g>
    <g class="${s.pose} ${s.pPoint}"><path d="M0 -84 L30 -96 M0 -84 L-14 -58"/></g>
    <g class="${s.pose} ${s.pFist}"><path d="M0 -84 L12 -112 L10 -124 M0 -84 L-14 -58"/><circle cx="10" cy="-128" r="5" fill="var(--you)" stroke="none"/></g>
    <g class="${s.pose} ${s.pWave}"><path d="M0 -84 L18 -110 L24 -126 M0 -84 L-14 -58"/></g>
  </g>
</g></g>`;

const FRIEND_HEAD = (stroke) =>
  `<circle cx="0" cy="-118" r="16" fill="var(--bg)"/><path d="M-10 -134 L-4 -144 L0 -135 L6 -145 L10 -134" stroke="${stroke}"/>`;

export const PROPS = {
  practice: (s) => `
    <g class="${s.ln}" stroke="var(--you)" stroke-width="4">
      <path d="M18 -54 L96 -54 M86 -54 L86 0 M30 -54 L30 0"/>
      <path d="M34 -60 L74 -60 L82 -94 L42 -94 Z" fill="var(--surface)"/>
    </g>
    <g class="${s.screenCode}"><path class="${s.ln}" d="M50 -84 L64 -84 M48 -76 L70 -76 M52 -68 L60 -68" stroke="var(--you)" stroke-width="3"/></g>`,

  friend: (s) => `
    <g class="${s.friend}" transform="translate(66 0)">
      <g class="${s.ln}" stroke="var(--you)" stroke-width="5">
        ${FRIEND_HEAD("var(--you)")}
        <path d="M0 -102 L0 -46 M0 -46 L-14 0 M0 -46 L14 0 M0 -84 L14 -58"/>
        <g class="${s.friendArm}"><path d="M0 -84 L-16 -58"/></g>
      </g>
    </g>
    <g class="${s.fiveSpark} ${s.ln}" stroke="var(--you)" stroke-width="3"><path d="M40 -150 L40 -164 M28 -146 L20 -156 M52 -146 L60 -156"/></g>
    <text class="${s.friendSays}" x="66" y="-176" text-anchor="middle">up top!</text>`,

  daily: (s) => `
    <g class="${s.ln}" stroke="var(--you)" stroke-width="4">
      <rect x="40" y="-120" width="74" height="74" rx="8" fill="var(--surface)"/>
      <path d="M40 -100 L114 -100 M58 -130 L58 -112 M96 -130 L96 -112"/>
    </g>
    <path class="${s.star}" d="M77 -92 L81 -82 L92 -82 L83.5 -75.5 L86.5 -65 L77 -71 L67.5 -65 L70.5 -75.5 L62 -82 L73 -82 Z" fill="none" stroke="var(--you)" stroke-width="3" stroke-linejoin="round"/>
    <path class="${s.tick} ${s.ln}" d="M54 -58 L66 -50 L100 -66" stroke="var(--opp)" stroke-width="4"/>`,

  board: (s) => `
    <g class="${s.ln}" stroke="var(--control-border)" stroke-width="4" fill="var(--surface)">
      <rect x="30" y="-40" width="56" height="40"/><rect x="86" y="-70" width="56" height="70"/><rect x="142" y="-26" width="56" height="26"/>
    </g>
    <text class="${s.podiumNum}" x="58" y="-12" text-anchor="middle">2</text>
    <text class="${s.podiumNum}" x="114" y="-30" text-anchor="middle">1</text>
    <text class="${s.podiumNum}" x="170" y="-6" text-anchor="middle">3</text>
    <g transform="translate(114 -70)"><g class="${s.rival}">
      <g class="${s.ln}" stroke="var(--opp)" stroke-width="5">
        ${FRIEND_HEAD("var(--opp)")}
        <path d="M0 -102 L0 -46 M0 -46 L-14 0 M0 -46 L14 0 M0 -84 L-18 -108 M0 -84 L18 -108"/>
      </g>
    </g></g>
    <text class="${s.rivalSays}" x="146" y="-196">come and get it</text>`,

  end: () => "",
};
