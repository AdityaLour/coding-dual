import { useId, useState } from "react";
import s from "./Account.module.css";

// A labelled box with its own error line. Passwords get a Show / Hide button.
export default function Field({ label, error, hint, optional, password, ...input }) {
  const id = useId();
  const [shown, setShown] = useState(false);
  const described = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ");
  return (
    <div className={s.f}>
      <label htmlFor={id}>
        {label}
        {optional && <span className={s.opt}> (optional)</span>}
      </label>
      <div className={s.inp}>
        <input
          id={id}
          {...input}
          type={password ? (shown ? "text" : "password") : (input.type ?? "text")}
          className={password ? s.pw : undefined}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={described || undefined}
        />
        {password && (
          <button type="button" className={s.eye} aria-pressed={shown} aria-controls={id} onClick={() => setShown(!shown)}>
            {shown ? "Hide" : "Show"}
          </button>
        )}
      </div>
      {hint && (
        <p className={s.hint} id={`${id}-hint`}>
          {hint}
        </p>
      )}
      {error && (
        <p className={s.err} id={`${id}-error`} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
