import { Link } from "react-router";
import TextField from "@/shared/ui/TextField.jsx";
import AuthLayout from "./AuthLayout.jsx";
import { useAuthForm } from "./useAuthForm.js";
import styles from "./AuthForm.module.css";

const NOT_CONNECTED = "Logging in isn't connected to the server yet.";

export default function LoginPage() {
  const { values, errors, status, setStatus, update, validate } = useAuthForm();

  function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) return;
    setStatus(NOT_CONNECTED);
  }

  return (
    <AuthLayout
      heading="Welcome back."
      blurb="Log in to find a rival and start a duel."
    >
      <title>Log in — Boip</title>
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
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
        <button type="submit" className={`btn btn-primary ${styles.submit}`}>
          Log in
        </button>
        <div className={styles.divider}>or</div>
        <button
          type="button"
          className={`btn btn-secondary ${styles.google}`}
          onClick={() => setStatus(NOT_CONNECTED)}
        >
          Continue with Google
        </button>
        <div aria-live="polite">
          {status && <p className={styles.status}>{status}</p>}
        </div>
        <p className={styles.switch}>
          New to Boip? <Link to="/signup">Create an account</Link>
        </p>
      </form>
    </AuthLayout>
  );
}
