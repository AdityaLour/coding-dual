import { useState } from "react";
import { Navigate, useNavigate } from "react-router";
import TextField from "@/shared/ui/TextField.jsx";
import { api } from "@/shared/api/client.js";
import { useAuth } from "@/shared/auth/useAuth.js";
import FormStatus from "./FormStatus.jsx";
import { useAuthForm } from "./useAuthForm.js";
import { randomHandle } from "./handles.js";
import { rules } from "./rules.js";
import styles from "./AuthForm.module.css";

// First Google sign-in (or a reset of an unconfirmed account): the account needs a username.
export default function WelcomePage() {
  const { user, signedIn, signedOut, logout, retry } = useAuth();
  const navigate = useNavigate();
  const {
    values,
    setField,
    errors,
    status,
    setStatus,
    busy,
    update,
    validate,
    submit,
    formRef,
  } = useAuthForm();
  const [leaving, setLeaving] = useState(false);

  if (user.username) return <Navigate to="/home" replace />;

  function handleSubmit(event) {
    event.preventDefault();
    if (!validate({ username: rules.username })) return;
    submit(
      async () => {
        const data = await api("/username", {
          method: "POST",
          body: { username: values.username },
        });
        signedIn(data.user);
        navigate("/home", { replace: true });
      },
      {
        onError: (error) => {
          if (error.status === 401) {
            signedOut(); // session ended; the guard sends them to log in
            return true;
          }
          if (error.status === 409 && !error.data?.errors) {
            retry(); // already has a name (another tab?): reload the session
            return true;
          }
          return false;
        },
      },
    );
  }

  async function handleLogout() {
    setLeaving(true);
    try {
      await logout();
      navigate("/", { replace: true });
      signedOut();
    } catch {
      setLeaving(false);
      setStatus({
        tone: "error",
        text: "Couldn't log out. Check your connection and try again.",
      });
    }
  }

  return (
    <form
      ref={formRef}
      className={styles.form}
      onSubmit={handleSubmit}
      noValidate
    >
      <title>Pick a username — Boip</title>
      <h1 className={styles.title}>Pick a username</h1>
      <p className={styles.text}>
        Signed in as <strong>{user.email}</strong>. This is the name other
        players see.
      </p>
      <TextField
        label="Username"
        name="username"
        autoComplete="nickname"
        autoCapitalize="none"
        spellCheck={false}
        maxLength={20}
        value={values.username}
        onChange={update("username")}
        error={errors.username}
        hint="Letters, numbers, _ or -."
        action={{
          label: "Shuffle",
          ariaLabel: "Suggest another username",
          onClick: () => setField("username", randomHandle()),
        }}
      />
      <button
        type="submit"
        className={`btn btn-primary ${styles.submit}`}
        disabled={busy}
        aria-busy={busy}
      >
        {busy ? "Saving…" : "Continue"}
      </button>
      <FormStatus status={status} />
      <button
        type="button"
        className={styles.textButton}
        onClick={handleLogout}
        disabled={leaving}
      >
        {leaving ? "Logging out…" : "Not you? Log out"}
      </button>
    </form>
  );
}
