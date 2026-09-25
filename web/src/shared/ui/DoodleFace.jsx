// The doodle avatar used across the site. Variants give rivals different looks.
// 0 headphones · 1 spiky hair · 2 glasses · 3 cap · 4 swoop
const HAIR = [
  () => (
    <>
      <path
        d="M18 30 C18 14 46 14 46 30"
        fill="none"
        stroke="var(--opp)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <rect x="14" y="27" width="6" height="10" rx="3" fill="var(--opp)" />
      <rect x="44" y="27" width="6" height="10" rx="3" fill="var(--opp)" />
    </>
  ),
  (c) => (
    <path
      d="M22 22 L28 14 L32 21 L37 13 L42 22"
      fill="none"
      stroke={c}
      strokeWidth="3"
      strokeLinejoin="round"
    />
  ),
  (c) => (
    <>
      <circle cx="27" cy="30" r="4" fill="none" stroke={c} strokeWidth="2" />
      <circle cx="37" cy="30" r="4" fill="none" stroke={c} strokeWidth="2" />
    </>
  ),
  (c) => (
    <path
      d="M20 24 C24 16 40 16 44 24 Z M18 24 L46 24"
      fill="none"
      stroke={c}
      strokeWidth="3"
      strokeLinecap="round"
    />
  ),
  (c) => (
    <path
      d="M24 20 C26 14 38 14 40 20"
      fill="none"
      stroke={c}
      strokeWidth="3"
      strokeLinecap="round"
    />
  ),
];

export const FACE_VARIANTS = HAIR.length;

export default function DoodleFace({
  variant = 0,
  side = "you",
  size = 40,
  background = "var(--surface)",
  className,
}) {
  const c = side === "opp" ? "var(--opp)" : "var(--you)";
  const v = ((variant % HAIR.length) + HAIR.length) % HAIR.length;
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden="true"
    >
      <circle
        cx="32"
        cy="32"
        r="31"
        fill={background}
        stroke={c}
        strokeWidth="2"
      />
      {HAIR[v](c)}
      <circle cx="32" cy="31" r="11" fill="none" stroke={c} strokeWidth="3" />
      {v !== 2 && (
        <>
          <circle cx="28" cy="30" r="1.8" fill={c} />
          <circle cx="36" cy="30" r="1.8" fill={c} />
        </>
      )}
      <path
        d="M28 35 Q32 38 36 35"
        fill="none"
        stroke={c}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M16 58 C19 46 45 46 48 58"
        fill="none"
        stroke={c}
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
