import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import TextField from "@/shared/ui/TextField.jsx";
import { api } from "@/shared/api/client.js";
import { useAuth } from "@/shared/auth/useAuth.js";
import FormStatus from "./FormStatus.jsx";
import { useAuthForm } from "./useAuthForm.js";
import { rules } from "./rules.js";
import { AUTH_PATHS, tokenFromHash } from "./authCopy.js";
import styles from "./AuthForm.module.css";

export default function ResetPasswordPage() {
  const { signedIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [token] = useState(() => tokenFromHash(location.hash));
  const [expired, setExpired] = useState(!token);
  const { values, errors, status, busy, update, validate, submit, formRef } =
    useAuthForm();

  // Keep the token out of the address bar (and history) once it's been read.
  useEffect(() => {
    if (location.hash) navigate(location.pathname, { replace: true });
  }, [location.hash, location.pathname, navigate]);

  function handleSubmit(event) {
    event.preventDefault();
    if (!validate({ password: rules.newPassword })) return;
    submit(
      async () => {
        const data = await api("/reset-password", {
          method: "POST",
          body: { token, password: values.password },
        });
        signedIn(data.user);
        navigate(data.user.username ? "/home" : AUTH_PATHS.welcome, {
          replace: true,
        });
      },
      {
        // A 400 without field errors means the link itself is bad.
        onError: (error) => {
          if (error.status !== 400 || error.data?.errors) return false;
          setExpired(true);
          return true;
        },
      },
    );
  }

  if (expired) {
    return (
      <div className={styles.form}>
        <title>Link expired — Boip</title>
        <h1 className={styles.title}>This link has expired</h1>
        <p className={styles.text}>
          Reset links work once and last 30 minutes. Ask for a new one and use
          the newest email.
        </p>
        <Link to={AUTH_PATHS.forgot} className="btn btn-primary">
          Send a new link
        </Link>
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      className={styles.form}
      onSubmit={handleSubmit}
      noValidate
    >
      <title>Choose a new password — Boip</title>
      <h1 className={styles.title}>Choose a new password</h1>
      <TextField
        label="New password"
        type="password"
        name="password"
        autoComplete="new-password"
        value={values.password}
        onChange={update("password")}
        error={errors.password}
        hint="At least 8 characters. You'll be logged out everywhere else."
      />
      <button
        type="submit"
        className={`btn btn-primary ${styles.submit}`}
        disabled={busy}
        aria-busy={busy}
      >
        {busy ? "Saving…" : "Save and log in"}
      </button>
      <FormStatus status={status} />
    </form>
  );
}
