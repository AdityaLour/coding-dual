import s from "./JudgeDoodle.module.css";

// A stick figure without arms: head, body and legs, standing at x.
function Body({ x }) {
  return (
    <>
      <circle className={s.ink} cx={x} cy="90" r="12" />
      <path
        className={s.ink}
        d={`M${x} 102 L${x} 148 M${x} 148 L${x - 11} 190 M${x} 148 L${x + 11} 190`}
      />
    </>
  );
}

const CONFETTI = Array.from({ length: 10 }, (_, i) => ({
  x: 20 + i * 23,
  color: i % 3 === 0 ? "var(--opp)" : "var(--you)",
  delay: `${(i % 4) * 0.12}s`,
}));

// Decorative story loop on the auth brand panel: two coders race, the judge decides.
export default function JudgeDoodle() {
  return (
    <div className={s.root} aria-hidden="true">
      <svg viewBox="0 0 260 250">
        <path className={s.ground} d="M10 192 C80 189 180 195 250 191" />

        {/* clock and scoreboard */}
        <circle
          className={`${s.ink} ${s.thin} ${s.neutral}`}
          cx="22"
          cy="26"
          r="13"
        />
        <path
          className={`${s.ink} ${s.thin} ${s.neutral} ${s.hand}`}
          d="M22 26 L22 16"
        />
        <text
          className={`${s.score} ${s.scoreBefore}`}
          x="232"
          y="34"
          textAnchor="middle"
        >
          0 : 0
        </text>
        <text
          className={`${s.score} ${s.scoreAfter}`}
          x="232"
          y="34"
          textAnchor="middle"
        >
          1 : 0
        </text>

        {/* bone: you */}
        <g className={`${s.you} ${s.figL}`}>
          <Body x={40} />
          <g className={s.armsL}>
            <path className={s.ink} d="M40 114 L62 146 M40 118 L68 146" />
          </g>
          <path
            className={`${s.ink} ${s.crown}`}
            d="M28 72 L30 58 L36 66 L40 54 L44 66 L50 58 L52 72 Z"
          />
        </g>
        <g className={s.bulb}>
          <circle
            className={`${s.ink} ${s.thin} ${s.you}`}
            cx="40"
            cy="58"
            r="8"
          />
          <path
            className={`${s.ink} ${s.thin} ${s.you}`}
            d="M37 68 L43 68 M40 44 L40 40 M28 50 L25 47 M52 50 L55 47"
          />
        </g>
        <path
          className={`${s.ink} ${s.you}`}
          d="M54 150 L82 150 M82 150 L88 126"
        />
        <path
          className={`${s.ink} ${s.thin} ${s.you}`}
          d="M94 150 L94 138 L104 138 L104 150 Z M104 141 C110 141 110 147 104 147"
        />
        <path
          className={`${s.ink} ${s.hair} ${s.neutral} ${s.steam}`}
          d="M97 132 C95 128 100 126 98 122"
        />
        <path
          className={`${s.ink} ${s.hair} ${s.neutral} ${s.steam} ${s.steamLate}`}
          d="M101 132 C99 128 104 126 102 122"
        />

        {/* red: the rival */}
        <g className={`${s.opp} ${s.figR}`}>
          <Body x={220} />
          <g className={s.armsR}>
            <path className={s.ink} d="M220 114 L198 146 M220 118 L192 146" />
          </g>
        </g>
        <path
          className={`${s.ink} ${s.thin} ${s.opp} ${s.sweat}`}
          d="M234 84 C231 90 237 90 234 84"
        />
        <path
          className={`${s.ink} ${s.opp}`}
          d="M206 150 L178 150 M178 150 L172 126"
        />

        {/* the judge */}
        <g className={s.bot}>
          <rect
            className={`${s.ink} ${s.neutral}`}
            x="106"
            y="36"
            width="48"
            height="40"
            rx="8"
          />
          <path className={`${s.ink} ${s.neutral}`} d="M130 36 L130 26" />
          <circle className={`${s.ink} ${s.neutral}`} cx="130" cy="23" r="3" />
          <text className={s.idle} x="130" y="64" textAnchor="middle">
            ?
          </text>
          <g className={s.thinking}>
            <circle cx="120" cy="57" r="3" />
            <circle cx="130" cy="57" r="3" />
            <circle cx="140" cy="57" r="3" />
          </g>
          <path
            className={`${s.ink} ${s.opp} ${s.wrong}`}
            d="M122 48 L138 64 M138 48 L122 64"
          />
          <path
            className={`${s.ink} ${s.you} ${s.right}`}
            d="M119 56 L127 64 L141 47"
          />
        </g>
        <text className={s.label} x="130" y="96" textAnchor="middle">
          judge
        </text>
        <g className={s.sparkle}>
          <path
            className={`${s.ink} ${s.neutral}`}
            d="M130 14 L130 4 M96 30 L88 24 M164 30 L172 24 M96 70 L86 74 M164 70 L174 74"
          />
        </g>
        <text className={`${s.code} ${s.huh}`} x="238" y="72" fill="var(--opp)">
          ?!
        </text>

        {/* submissions and typing */}
        <text
          className={`${s.code} ${s.throwRed}`}
          x="192"
          y="122"
          textAnchor="middle"
          fill="var(--opp)"
        >
          print(x)
        </text>
        <text
          className={`${s.code} ${s.throwBone}`}
          x="72"
          y="122"
          textAnchor="middle"
          fill="var(--you)"
        >
          {"{ }"}
        </text>
        <text
          className={`${s.code} ${s.typeBone}`}
          x="70"
          y="120"
          fill="var(--you)"
        >
          ;
        </text>
        <text
          className={`${s.code} ${s.typeBone} ${s.late}`}
          x="80"
          y="114"
          fill="var(--you)"
        >
          {"{"}
        </text>
        <text
          className={`${s.code} ${s.typeRed}`}
          x="184"
          y="120"
          fill="var(--opp)"
        >
          (
        </text>
        <text
          className={`${s.code} ${s.typeRed} ${s.late}`}
          x="174"
          y="114"
          fill="var(--opp)"
        >
          =
        </text>

        {CONFETTI.map((c) => (
          <rect
            key={c.x}
            className={s.confetti}
            x={c.x}
            y="0"
            width="6"
            height="10"
            rx="1"
            fill={c.color}
            style={{ animationDelay: c.delay }}
          />
        ))}
      </svg>
    </div>
  );
}
