import { useId, useState } from "react";
import styles from "./TextField.module.css";

// action: optional { label, ariaLabel, onClick } button inside the field (e.g. "Shuffle").
export default function TextField({
  label,
  type = "text",
  error,
  hint,
  action,
  ...inputProps
}) {
  const id = useId();
  const [revealed, setRevealed] = useState(false);
  const isPassword = type === "password";
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <div className={`${styles.control} ${action ? styles.hasAction : ""}`}>
        <input
          id={id}
          type={isPassword && revealed ? "text" : type}
          className={styles.input}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={describedBy || undefined}
          {...inputProps}
        />
        {isPassword && (
          <button
            type="button"
            className={styles.reveal}
            onClick={() => setRevealed((r) => !r)}
            aria-pressed={revealed}
          >
            {revealed ? "Hide" : "Show"}
          </button>
        )}
        {!isPassword && action && (
          <button
            type="button"
            className={styles.reveal}
            onClick={action.onClick}
            aria-label={action.ariaLabel}
          >
            {action.label}
          </button>
        )}
      </div>
      {hint && (
        <p id={`${id}-hint`} className={styles.hint}>
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className={styles.error}>
          {error}
        </p>
      )}
    </div>
  );
}
