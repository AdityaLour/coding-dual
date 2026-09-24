import { Link } from "react-router";
import TextField from "@/shared/ui/TextField.jsx";
import AuthLayout from "./AuthLayout.jsx";
import { useAuthForm } from "./useAuthForm.js";
import styles from "./AuthForm.module.css";

const NOT_CONNECTED = "Creating accounts isn't connected to the server yet.";

export default function SignupPage() {
  const { values, errors, status, setStatus, update, validate } = useAuthForm();

  function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) return;
    setStatus(NOT_CONNECTED);
  }

  return (
    <AuthLayout
      heading="Pick a side."
      blurb="Create an account and get matched with your first rival."
    >
      <title>Create an account — Boip</title>
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
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
        <div aria-live="polite">
          {status && <p className={styles.status}>{status}</p>}
        </div>
        <p className={styles.switch}>
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </form>
    </AuthLayout>
  );
}
