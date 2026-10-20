import { Link } from "react-router";
import buttons from "./buttons.module.css";
import styles from "./Finale.module.css";

// "Find a" and "rival." slide in from opposite sides and meet as the section arrives.
export default function Finale({ sectionRef }) {
  return (
    <section ref={sectionRef} className={styles.section}>
      <i className={`${styles.band} ${styles.you}`} />
      <i className={`${styles.band} ${styles.rival}`} />
      <div className={styles.wrap}>
        <h2 className={styles.title}>
          <span className={styles.a}>Find a</span>
          <span className={styles.b}>rival.</span>
        </h2>
        <div className={styles.ctas}>
          <Link to="/signup" className={`${buttons.btn} ${buttons.primary}`}>
            Sign up
          </Link>
          <Link to="/login" className={buttons.btn}>
            Log in
          </Link>
        </div>
      </div>
    </section>
  );
}
