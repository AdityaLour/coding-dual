import { useRef, useState } from "react";
import { emailProblem } from "../logic.js";
import { cancelEmailChange, changeEmail, resendEmailChange } from "../api.js";
import { failText, waitSeconds, wrongPassword } from "./errors.js";
import { useCountdown } from "./useCountdown.js";
import Field from "./Field.jsx";
import p from "../Profile.module.css";
import s from "./Account.module.css";

export default function EmailSection({ account, say }) {
  // A change started earlier (even on another device) still waits for its link, so open straight on it.
  const [mode, setMode] = useState(account.pendingEmail ? "pending" : "idle"); // "idle" | "form" | "pending"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [problem, setProblem] = useState(null); // { field, message }
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState(account.pendingEmail ?? "");
  const [wait, setWait] = useCountdown(); // seconds until the link can be sent again
  const form = useRef(null);

  const googleOnly = account.google;
  const current = (
    <div className={s.kv}>
      <span className={s.k}>Email</span>
      <span className={s.v}>
        {account.email}
        {googleOnly ? (
          <span className={s.pill}>Google</span>
        ) : account.verified ? (
          <span className={s.pill}>Verified</span>
        ) : null}
      </span>
      {mode === "idle" && !googleOnly && (
        <button type="button" className={`${p.btn} ${p.ghost} ${p.sm}`} onClick={() => setMode("form")}>
          Change email
        </button>
      )}
    </div>
  );

  if (googleOnly)
    return (
      <>
        {current}
        <p className={s.hint}>Your email comes from your Google account, so it can&apos;t be changed here.</p>
      </>
    );

  async function send(to, confirm) {
    setBusy(true);
    setProblem(null);
    try {
      await changeEmail({ email: to, password: confirm });
      setSentTo(to);
      setMode("pending");
      setPassword("");
      setWait(60);
      say(`Verification link sent to ${to}.`);
    } catch (error) {
      setProblem({ field: wrongPassword(error) ? "password" : "form", message: failText(error, "Changing your email") });
    } finally {
      setBusy(false);
    }
  }

  async function onSubmit(event) {
    event.preventDefault();
    const bad = emailProblem(email, account.email);
    if (bad) {
      setProblem({ field: "email", message: bad });
      form.current.elements.email.focus();
      return;
    }
    if (!password) {
      setProblem({ field: "password", message: "Enter your current password to confirm." });
      form.current.elements.password.focus();
      return;
    }
    await send(email.trim().toLowerCase(), password);
  }

  const close = () => {
    setMode("idle");
    setProblem(null);
    setPassword("");
  };

  async function resend() {
    setBusy(true);
    setProblem(null);
    try {
      await resendEmailChange();
      setWait(60);
      say(`New link sent to ${sentTo}. The earlier one no longer works.`);
    } catch (error) {
      if (error.status === 409) return close(); // the change is gone (expired or cancelled somewhere else)
      const seconds = waitSeconds(error);
      if (seconds) setWait(seconds);
      else say(failText(error, "Sending the link"));
    } finally {
      setBusy(false);
    }
  }

  async function cancelChange() {
    setBusy(true);
    try {
      await cancelEmailChange();
      say("Email change cancelled.");
      close();
    } catch (error) {
      say(failText(error, "Cancelling the change"));
    } finally {
      setBusy(false);
    }
  }
  const on = (field) => (problem?.field === field ? problem.message : undefined);

  return (
    <>
      {current}
      {mode === "form" && (
        <form ref={form} onSubmit={onSubmit} noValidate>
          <Field
            label="New email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={on("email")}
          />
          <Field
            label="Current password"
            name="password"
            password
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={on("password")}
          />
          {on("form") && (
            <p className={s.err} role="alert">
              {on("form")}
            </p>
          )}
          <div className={s.row}>
            <button type="submit" className={`${p.btn} ${p.sm}`} disabled={busy}>
              {busy ? "Sending…" : "Send verification link"}
            </button>
            <button type="button" className={`${p.btn} ${p.ghost} ${p.sm}`} onClick={close}>
              Cancel
            </button>
          </div>
        </form>
      )}
      {mode === "pending" && (
        <div className={s.pend} role="status">
          <p>
            We sent a link to <b>{sentTo}</b>. Your email changes when you open it, within an hour. Until then you keep
            signing in with <b>{account.email}</b>.
          </p>
          <div className={s.row}>
            <button type="button" className={`${p.btn} ${p.ghost} ${p.sm}`} disabled={busy || wait > 0} onClick={resend}>
              {wait > 0 ? `Send again in ${wait}s` : "Send the link again"}
            </button>
            <button type="button" className={`${p.btn} ${p.ghost} ${p.sm}`} disabled={busy} onClick={() => setMode("form")}>
              Use a different address
            </button>
            <button type="button" className={`${p.btn} ${p.ghost} ${p.sm}`} disabled={busy} onClick={cancelChange}>
              Cancel change
            </button>
          </div>
        </div>
      )}
    </>
  );
}
