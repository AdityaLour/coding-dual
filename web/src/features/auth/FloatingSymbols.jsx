import s from "./FloatingSymbols.module.css";

// [symbol, left %, top %, seconds per rise]
const SYMBOLS = [
  ["{", 8, 70, 14],
  ["}", 86, 20, 18],
  [";", 12, 30, 16],
  ["=>", 80, 78, 20],
  ["()", 20, 88, 17],
  ["[ ]", 90, 50, 15],
  ["//", 6, 55, 19],
  ["< >", 84, 92, 16],
];

// Faint code symbols rising slowly behind the form.
export default function FloatingSymbols() {
  return (
    <div className={s.layer} aria-hidden="true">
      {SYMBOLS.map(([symbol, x, y, seconds], i) => (
        <span
          key={symbol}
          className={s.symbol}
          style={{
            left: `${x}%`,
            top: `${y}%`,
            animationDuration: `${seconds}s`,
            animationDelay: `-${i * 2.3}s`,
          }}
        >
          {symbol}
        </span>
      ))}
    </div>
  );
}
