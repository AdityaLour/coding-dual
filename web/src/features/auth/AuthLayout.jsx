import Logo from "@/shared/ui/Logo.jsx";
import styles from "./AuthLayout.module.css";

export default function AuthLayout({ heading, blurb, children }) {
  return (
    <div className={styles.page}>
      <aside className={styles.brand}>
        <Logo />
        <div className={styles.brandText}>
          <p className={styles.heading}>{heading}</p>
          <p className={styles.blurb}>{blurb}</p>
        </div>
      </aside>
      <main className={styles.main}>
        <div className={styles.panel}>{children}</div>
      </main>
    </div>
  );
}
