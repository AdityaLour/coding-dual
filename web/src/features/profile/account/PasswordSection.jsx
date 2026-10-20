import { useRef, useState } from "react";
import { STRENGTH_LABELS, passwordChecks, passwordProblem, passwordStrength } from "../logic.js";
import { changePassword } from "../api.js";
import { failText, wrongPassword } from "./errors.js";
import Field from "./Field.jsx";
import p from "../Profile.module.css";
import s from "./Account.module.css";

const EMPTY = { current: "", next: "", confirm: "" };

const RULES = [
  ["len", "At least 8 characters"],
  ["mix", "A letter and a number"],
  ["diff", "Different from your current password"],
  ["match", "Both new passwords match"],
];

// needsCurrent is false for a Google account that has never had a password: it sets one without proving an old one.
export default function PasswordSection({ needsCurrent, say, onChanged }) {
  const [values, setValues] = useState(EMPTY);
  const [problem, setProblem] = useState(null); // { field, message }
  const [busy, setBusy] = useState(false);
  const form = useRef(null);

  const set = (field) => (event) => setValues({ ...values, [field]: event.target.value });
  const checks = passwordChecks(values, needsCurrent);
  const strength = passwordStrength(values.next);
  const on = (field) => (problem?.field === field ? problem.message : undefined);

  async function onSubmit(event) {
    event.preventDefault();
    const bad = passwordProblem(values, needsCurrent);
    if (bad) {
      setProblem(bad);
      form.current.elements.namedItem(bad.field)?.focus();
      return;
    }
    setBusy(true);
    setProblem(null);
    try {
      await changePassword({ current: needsCurrent ? values.current : undefined, next: values.next });
      setValues(EMPTY);
      say(needsCurrent ? "Password changed. Other devices were signed out." : "Password set. You can now sign in with your email too.");
      onChanged();
    } catch (error) {
      setProblem({ field: wrongPassword(error) ? "current" : "form", message: failText(error, "Changing your password") });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <p className={s.lead}>
        {needsCurrent
          ? "Changing your password signs you out everywhere else."
          : "You sign in with Google, so you have no password. Set one if you also want to sign in with your email."}
      </p>
      <form ref={form} onSubmit={onSubmit} noValidate>
        {needsCurrent && (
          <Field
            label="Current password"
            name="current"
            password
            autoComplete="current-password"
            value={values.current}
            onChange={set("current")}
            error={on("current")}
          />
        )}
        <Field
          label="New password"
          name="next"
          password
          autoComplete="new-password"
          value={values.next}
          onChange={set("next")}
          error={on("next")}
        />
        <div className={s.str} aria-hidden="true">
          {[1, 2, 3, 4].map((n) => (
            <i key={n} data-on={n <= strength || undefined} />
          ))}
          <span>{STRENGTH_LABELS[strength] || " "}</span>
        </div>
        <ul className={s.rules}>
          {RULES.filter(([key]) => needsCurrent || key !== "diff").map(([key, text]) => (
            <li key={key} data-ok={checks[key] || undefined}>
              <span className="sr-only">{checks[key] ? "Done: " : "Not yet: "}</span>
              {text}
            </li>
          ))}
        </ul>
        <Field
          label="Confirm new password"
          name="confirm"
          password
          autoComplete="new-password"
          value={values.confirm}
          onChange={set("confirm")}
          error={on("confirm")}
        />
        {on("form") && (
          <p className={s.err} role="alert">
            {on("form")}
          </p>
        )}
        <div className={s.row}>
          <button type="submit" className={p.btn} disabled={busy}>
            {busy ? "Saving…" : needsCurrent ? "Change password" : "Set password"}
          </button>
        </div>
      </form>
    </>
  );
}
