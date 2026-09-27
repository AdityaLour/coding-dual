import styles from "./AuthForm.module.css";

// Polite live region: always in the page, so screen readers announce what appears in it.
// Orange = something went wrong; bone = information.
export default function FormStatus({ status, children }) {
  return (
    <div className={styles.live} aria-live="polite">
      {status && (
        <p className={status.tone === "info" ? styles.notice : styles.status}>
          {status.text}
        </p>
      )}
      {children}
    </div>
  );
}
