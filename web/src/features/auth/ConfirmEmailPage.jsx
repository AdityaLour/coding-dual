import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { ApiError, errorMessage } from "@/shared/api/client.js";
import { useAuth } from "@/shared/auth/useAuth.js";
import { confirmEmailChange } from "@/features/profile/api.js";
import { AUTH_PATHS, tokenFromHash } from "./authCopy.js";
import styles from "./AuthForm.module.css";

// Opened from the link sent to the NEW address. It changes the email and nothing else: it never logs anyone in,
// because the link may be opened on any device.
export default function ConfirmEmailPage() {
  const { status } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [token] = useState(() => tokenFromHash(location.hash));
  // { name: "checking" } | { name: "done", email } | { name: "invalid" } | { name: "refused", message } | { name: "offline" }
  const [phase, setPhase] = useState(token ? { name: "checking" } : { name: "invalid" });
  const [attempt, setAttempt] = useState(0);
  const started = useRef(-1);

  useEffect(() => {
    if (location.hash) navigate(location.pathname, { replace: true });
  }, [location.hash, location.pathname, navigate]);

  // A link works once, so the request must not run twice (StrictMode re-runs effects in dev).
  useEffect(() => {
    if (!token || started.current === attempt) return;
    started.current = attempt;
    confirmEmailChange(token).then(
      (data) => setPhase({ name: "done", email: data.email }),
      (error) => {
        const code = error instanceof ApiError ? error.status : 0;
        if (code === 0 || code >= 500 || code === 429) setPhase({ name: "offline", message: errorMessage(error) });
        else if (code === 409) setPhase({ name: "refused", message: errorMessage(error) });
        else setPhase({ name: "invalid" });
      },
    );
  }, [token, attempt]);

  const signedIn = status === "authed";
  const next = signedIn ? { to: "/profile/account", label: "Back to your account" } : { to: AUTH_PATHS.login, label: "Log in" };

  if (phase.name === "checking")
    return (
      <div className={styles.form} role="status">
        <title>Confirming your new email</title>
        <h1 className={styles.title}>Confirming your new email…</h1>
      </div>
    );

  if (phase.name === "offline")
    return (
      <div className={styles.form}>
        <title>Couldn&apos;t confirm</title>
        <h1 className={styles.title}>Couldn&apos;t confirm yet</h1>
        <p className={styles.text}>{phase.message}</p>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            setPhase({ name: "checking" });
            setAttempt((n) => n + 1);
          }}
        >
          Try again
        </button>
      </div>
    );

  if (phase.name === "done")
    return (
      <div className={styles.form} role="status">
        <title>Email changed</title>
        <h1 className={styles.title}>Your email is changed</h1>
        <p className={styles.text}>
          Log in with <strong>{phase.email}</strong> from now on. Your other devices were signed out.
        </p>
        <Link className={`btn btn-primary ${styles.submit}`} to={next.to}>
          {next.label}
        </Link>
      </div>
    );

  return (
    <div className={styles.form}>
      <title>{phase.name === "refused" ? "Couldn't change email" : "Link expired"}</title>
      <h1 className={styles.title}>{phase.name === "refused" ? "Couldn’t change your email" : "This link has expired"}</h1>
      <p className={styles.text}>
        {phase.name === "refused"
          ? phase.message
          : "Email-change links work once and last an hour. Start the change again from your account."}
      </p>
      <Link className={`btn btn-primary ${styles.submit}`} to={signedIn ? "/profile/account" : AUTH_PATHS.login}>
        {signedIn ? "Back to your account" : "Log in"}
      </Link>
    </div>
  );
}
