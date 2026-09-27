import { useState } from "react";
import { Link } from "react-router";
import TextField from "@/shared/ui/TextField.jsx";
import { api } from "@/shared/api/client.js";
import { useAuth } from "@/shared/auth/useAuth.js";
import AuthSwitchLink from "./AuthSwitchLink.jsx";
import FormStatus from "./FormStatus.jsx";
import GoogleButton from "./GoogleButton.jsx";
import { useAuthForm } from "./useAuthForm.js";
import { rules } from "./rules.js";
import { AUTH_PATHS } from "./authCopy.js";
import styles from "./AuthForm.module.css";

export default function LoginPage() {
  const { signedIn } = useAuth();
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
  } = useAuthForm();
  const [unverified, setUnverified] = useState(false);

  // Success only updates the session; the route guard then sends the player on.
  function handleSubmit(event) {
    event.preventDefault();
    if (!validate({ email: rules.email, password: rules.password })) return;
    setUnverified(false);
    submit(
      async () => {
        const data = await api("/login", {
          method: "POST",
          body: { email: values.email, password: values.password },
        });
        signedIn(data.user);
      },
      {
        onError: (error) => {
          if (error.data?.code !== "EMAIL_NOT_VERIFIED") return false;
          setUnverified(true);
          setStatus({ tone: "info", text: error.data.message });
          return true;
        },
      },
    );
  }

  function resendLink() {
    submit(async () => {
      await api("/resend-verification", {
        method: "POST",
        body: { email: values.email },
      });
      setUnverified(false);
      setStatus({
        tone: "info",
        text: `We sent a new link to ${values.email.trim()}.`,
      });
    });
  }

  function handleGoogle(idToken) {
    submit(
      async () => {
        const data = await api("/google", {
          method: "POST",
          body: { idToken },
        });
        signedIn(data.user);
      },
      { pending: "Signing you in with Google…" },
    );
  }

  return (
    <form
      ref={formRef}
      className={styles.form}
      onSubmit={handleSubmit}
      noValidate
    >
      <title>Log in — Boip</title>
      <h1 className={styles.title}>Log in</h1>
      <TextField
        label="Email"
        type="email"
        name="email"
        autoComplete="email"
        value={values.email}
        onChange={update("email")}
        error={errors.email}
      />
      <TextField
        label="Password"
        type="password"
        name="password"
        autoComplete="current-password"
        value={values.password}
        onChange={update("password")}
        error={errors.password}
      />
      <Link to={AUTH_PATHS.forgot} className={styles.forgot}>
        Forgot password?
      </Link>
      <button
        type="submit"
        className={`btn btn-primary ${styles.submit}`}
        disabled={busy}
        aria-busy={busy}
      >
        {busy ? "Logging in…" : "Log in"}
      </button>
      <div className={styles.divider}>or</div>
      <GoogleButton text="signin_with" onCredential={handleGoogle} />
      <FormStatus status={status}>
        {unverified && (
          <button
            type="button"
            className={styles.textButton}
            onClick={resendLink}
            disabled={busy}
          >
            Send a new confirmation link
          </button>
        )}
      </FormStatus>
      <p className={styles.switch}>
        New to Boip?{" "}
        <AuthSwitchLink to={AUTH_PATHS.signup}>
          Create an account
        </AuthSwitchLink>
      </p>
    </form>
  );
}
