import { useEffect, useRef } from "react";
import { api } from "@/shared/api/client.js";
import FormStatus from "./FormStatus.jsx";
import { useAuthForm } from "./useAuthForm.js";
import styles from "./AuthForm.module.css";

// After signup. The same screen shows whether or not the email already had an account,
// so signup can't be used to find out who's registered.
export default function CheckEmail({ email, onChangeEmail }) {
  const { status, setStatus, busy, submit, formRef } = useAuthForm();
  const heading = useRef(null);

  useEffect(() => heading.current?.focus(), []);

  function resend() {
    submit(async () => {
      await api("/resend-verification", { method: "POST", body: { email } });
      setStatus({
        tone: "info",
        text: "Sent again. It can take a minute to arrive.",
      });
    });
  }

  return (
    <div ref={formRef} className={styles.form}>
      <title>Check your email — Boip</title>
      <h1 ref={heading} tabIndex={-1} className={styles.title}>
        Check your email
      </h1>
      <p className={styles.text}>
        We sent a link to <strong>{email}</strong>. Open it to finish creating
        your account. It expires in 24 hours.
      </p>
      {import.meta.env.DEV && (
        <p className={styles.hint}>
          Development: emails land in Mailpit at <code>localhost:8025</code>.
        </p>
      )}
      <button
        type="button"
        className="btn btn-secondary"
        onClick={resend}
        disabled={busy}
        aria-busy={busy}
      >
        {busy ? "Sending…" : "Send it again"}
      </button>
      <button
        type="button"
        className={styles.textButton}
        onClick={onChangeEmail}
      >
        Use a different email
      </button>
      <FormStatus status={status} />
    </div>
  );
}
