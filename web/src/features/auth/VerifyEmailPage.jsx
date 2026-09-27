import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import TextField from "@/shared/ui/TextField.jsx";
import { ApiError, api, errorMessage } from "@/shared/api/client.js";
import { useAuth } from "@/shared/auth/useAuth.js";
import FormStatus from "./FormStatus.jsx";
import { useAuthForm } from "./useAuthForm.js";
import { rules } from "./rules.js";
import { AUTH_PATHS, tokenFromHash } from "./authCopy.js";
import styles from "./AuthForm.module.css";

// Opened from the email link. Confirms automatically, then logs in.
export default function VerifyEmailPage() {
  const { signedIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [token] = useState(() => tokenFromHash(location.hash));
  // "checking" | "expired" | "offline"
  const [phase, setPhase] = useState(token ? "checking" : "expired");
  const [attempt, setAttempt] = useState(0);
  const started = useRef(-1);
  const form = useAuthForm();

  useEffect(() => {
    if (location.hash) navigate(location.pathname, { replace: true });
  }, [location.hash, location.pathname, navigate]);

  // A link works once, so the request must not run twice (StrictMode re-runs effects in dev).
  useEffect(() => {
    if (!token || started.current === attempt) return;
    started.current = attempt;
    api("/verify-email", { method: "POST", body: { token } })
      .then((data) => {
        signedIn(data.user);
        navigate(data.user.username ? "/home" : AUTH_PATHS.welcome, {
          replace: true,
        });
      })
      .catch((error) => {
        const offline =
          error instanceof ApiError &&
          (error.status === 0 || error.status >= 500);
        setPhase(offline ? "offline" : "expired");
      });
  }, [token, attempt, signedIn, navigate]);

  if (phase === "checking") {
    return (
      <div className={styles.form} role="status">
        <title>Confirming your email — Boip</title>
        <h1 className={styles.title}>Confirming your email…</h1>
      </div>
    );
  }

  if (phase === "offline") {
    return (
      <div className={styles.form}>
        <title>Can&apos;t connect — Boip</title>
        <h1 className={styles.title}>Couldn&apos;t confirm yet</h1>
        <p className={styles.text}>{errorMessage(new ApiError(0, null))}</p>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            setPhase("checking");
            setAttempt((n) => n + 1);
          }}
        >
          Try again
        </button>
      </div>
    );
  }

  return <ExpiredLink form={form} />;
}

function ExpiredLink({ form }) {
  const {
    values,
    errors,
    status,
    setStatus,
    busy,
    update,
    validate,
    submit,
    formRef,
  } = form;

  function handleSubmit(event) {
    event.preventDefault();
    if (!validate({ email: rules.email })) return;
    submit(async () => {
      await api("/resend-verification", {
        method: "POST",
        body: { email: values.email },
      });
      setStatus({
        tone: "info",
        text: "If that account still needs confirming, a new link is on its way.",
      });
    });
  }

  return (
    <form
      ref={formRef}
      className={styles.form}
      onSubmit={handleSubmit}
      noValidate
    >
      <title>Link expired — Boip</title>
      <h1 className={styles.title}>This link has expired</h1>
      <p className={styles.text}>
        Confirmation links work once and last 24 hours. Already confirmed?{" "}
        <Link to={AUTH_PATHS.login}>Log in</Link>. Otherwise, get a new link:
      </p>
      <TextField
        label="Email"
        type="email"
        name="email"
        autoComplete="email"
        value={values.email}
        onChange={update("email")}
        error={errors.email}
      />
      <button
        type="submit"
        className={`btn btn-primary ${styles.submit}`}
        disabled={busy}
        aria-busy={busy}
      >
        {busy ? "Sending…" : "Send a new link"}
      </button>
      <FormStatus status={status} />
    </form>
  );
}
