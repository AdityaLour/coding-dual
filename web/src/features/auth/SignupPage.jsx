import { useState } from "react";
import TextField from "@/shared/ui/TextField.jsx";
import { api } from "@/shared/api/client.js";
import { useAuth } from "@/shared/auth/useAuth.js";
import AuthSwitchLink from "./AuthSwitchLink.jsx";
import CheckEmail from "./CheckEmail.jsx";
import FormStatus from "./FormStatus.jsx";
import GoogleButton from "./GoogleButton.jsx";
import { useAuthForm } from "./useAuthForm.js";
import { randomHandle } from "./handles.js";
import { rules } from "./rules.js";
import { AUTH_PATHS } from "./authCopy.js";
import styles from "./AuthForm.module.css";

export default function SignupPage() {
  const { signedIn } = useAuth();
  const {
    values,
    setField,
    errors,
    status,
    busy,
    update,
    validate,
    submit,
    formRef,
  } = useAuthForm();
  const [sentTo, setSentTo] = useState(null);

  function handleSubmit(event) {
    event.preventDefault();
    const ok = validate({
      email: rules.email,
      username: rules.username,
      password: rules.newPassword,
    });
    if (!ok) return;
    submit(async () => {
      await api("/signup", {
        method: "POST",
        body: {
          email: values.email,
          username: values.username,
          password: values.password,
        },
      });
      setSentTo(values.email.trim());
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
      { pending: "Signing you up with Google…" },
    );
  }

  if (sentTo) {
    return (
      <CheckEmail
        email={sentTo}
        onChangeEmail={() => {
          setField("password", "");
          setSentTo(null);
        }}
      />
    );
  }

  return (
    <form
      ref={formRef}
      className={styles.form}
      onSubmit={handleSubmit}
      noValidate
    >
      <title>Create an account — Boip</title>
      <h1 className={styles.title}>Create an account</h1>
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
        label="Username"
        name="username"
        autoComplete="nickname"
        autoCapitalize="none"
        spellCheck={false}
        maxLength={20}
        value={values.username}
        onChange={update("username")}
        error={errors.username}
        hint="Other players see this. Letters, numbers, _ or -."
        action={{
          label: "Shuffle",
          ariaLabel: "Suggest another username",
          onClick: () => setField("username", randomHandle()),
        }}
      />
      <TextField
        label="Password"
        type="password"
        name="password"
        autoComplete="new-password"
        value={values.password}
        onChange={update("password")}
        error={errors.password}
        hint="At least 8 characters."
      />
      <button
        type="submit"
        className={`btn btn-primary ${styles.submit}`}
        disabled={busy}
        aria-busy={busy}
      >
        {busy ? "Creating account…" : "Create account"}
      </button>
      <div className={styles.divider}>or</div>
      <GoogleButton text="signup_with" onCredential={handleGoogle} />
      <FormStatus status={status} />
      <p className={styles.switch}>
        Already have an account?{" "}
        <AuthSwitchLink to={AUTH_PATHS.login}>Log in</AuthSwitchLink>
      </p>
    </form>
  );
}
