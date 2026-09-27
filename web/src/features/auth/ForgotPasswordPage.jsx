import { useState } from "react";
import { Link } from "react-router";
import TextField from "@/shared/ui/TextField.jsx";
import { api } from "@/shared/api/client.js";
import FormStatus from "./FormStatus.jsx";
import { useAuthForm } from "./useAuthForm.js";
import { rules } from "./rules.js";
import { AUTH_PATHS } from "./authCopy.js";
import styles from "./AuthForm.module.css";

export default function ForgotPasswordPage() {
  const { values, errors, status, busy, update, validate, submit, formRef } =
    useAuthForm();
  const [sentTo, setSentTo] = useState(null);

  function handleSubmit(event) {
    event.preventDefault();
    if (!validate({ email: rules.email })) return;
    submit(async () => {
      await api("/forgot-password", {
        method: "POST",
        body: { email: values.email },
      });
      setSentTo(values.email.trim());
    });
  }

  if (sentTo) {
    return (
      <div className={styles.form}>
        <title>Check your email — Boip</title>
        <h1 className={styles.title}>Check your email</h1>
        <p className={styles.text}>
          If <strong>{sentTo}</strong> has a Boip account, we&apos;ve sent it a
          link to choose a new password. The link expires in 30 minutes.
        </p>
        <Link to={AUTH_PATHS.login} className="btn btn-secondary">
          Back to log in
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
      <title>Reset your password — Boip</title>
      <h1 className={styles.title}>Reset your password</h1>
      <p className={styles.text}>
        Enter your email and we&apos;ll send you a reset link.
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
        {busy ? "Sending…" : "Send reset link"}
      </button>
      <FormStatus status={status} />
      <p className={styles.switch}>
        Remembered it? <Link to={AUTH_PATHS.login}>Log in</Link>
      </p>
    </form>
  );
}
