import { Link } from "react-router";
import styles from "./Logo.module.css";

export default function Logo() {
  return (
    <Link to="/" className={styles.logo} aria-label="Boip home">
      <svg className={styles.mark} viewBox="0 0 26 26" aria-hidden="true">
        <path d="M0 0h15L9 26H0z" fill="var(--you)" />
        <path d="M17 0h9v26H11z" fill="var(--opp)" />
      </svg>
      <span className={styles.word}>Boip</span>
    </Link>
  );
}
