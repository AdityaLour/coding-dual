import TextField from "@/shared/ui/TextField.jsx";
import AuthSwitchLink from "./AuthSwitchLink.jsx";
import { useAuthForm } from "./useAuthForm.js";
import { AUTH_PATHS } from "./authCopy.js";
import styles from "./AuthForm.module.css";

const NOT_CONNECTED = "Creating accounts isn't connected to the server yet.";

export default function SignupPage() {
  const { values, errors, status, setStatus, update, validate, formRef } =
    useAuthForm();

  function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) return;
    setStatus(NOT_CONNECTED);
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
        label="Password"
        type="password"
        name="password"
        autoComplete="new-password"
        value={values.password}
        onChange={update("password")}
        error={errors.password}
      />
      <button type="submit" className={`btn btn-primary ${styles.submit}`}>
        Create account
      </button>
      <div className={styles.divider}>or</div>
      <button
        type="button"
        className={`btn btn-secondary ${styles.google}`}
        onClick={() => setStatus(NOT_CONNECTED)}
      >
        Sign up with Google
      </button>
      <div className={styles.live} aria-live="polite">
        {status && <p className={styles.status}>{status}</p>}
      </div>
      <p className={styles.switch}>
        Already have an account?{" "}
        <AuthSwitchLink to={AUTH_PATHS.login}>Log in</AuthSwitchLink>
      </p>
    </form>
  );
}
