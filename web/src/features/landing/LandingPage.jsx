import { Link } from "react-router";
import Logo from "@/shared/ui/Logo.jsx";
import Seam from "@/shared/ui/Seam.jsx";
import styles from "./LandingPage.module.css";

export default function LandingPage() {
  return (
    <div className={styles.page}>
      <title>Boip — live 1v1 coding duels</title>
      <Seam top={74} bottom={60} className={styles.seam} />

      <header className={styles.header}>
        <Logo />
        <nav className={styles.nav} aria-label="Account">
          <Link to="/login" className={styles.navLink}>
            Log in
          </Link>
          <Link to="/signup" className="btn btn-primary">
            Sign up
          </Link>
        </nav>
      </header>

      <main className={styles.main}>
        <h1 className={styles.title}>
          Two coders.
          <br />
          One problem.
          <br />
          First correct answer wins.
        </h1>
        <p className={styles.lede}>
          Get matched with someone near your skill, solve the same problem, and
          race to a correct submission in C, C++, Java, Python or JavaScript.
        </p>
        <div className={styles.actions}>
          <Link to="/signup" className="btn btn-primary">
            Create an account
          </Link>
          <p className={styles.alt}>
            Already have one? <Link to="/login">Log in</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
