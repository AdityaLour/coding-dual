import { Link } from "react-router";
import Logo from "@/shared/ui/Logo.jsx";
import { LANGUAGES } from "@/features/duel/languages.js";
import DuelBand from "./DuelBand.jsx";
import buttons from "./buttons.module.css";
import styles from "./Act1.module.css";

const WORDS = [
  { id: "duel", word: "Duel.", text: "Race a rival on the same problem, on the same clock." },
  { id: "practice", word: "Practice.", text: "Warm up on your own. Nothing touches your rating." },
  { id: "climb", word: "Climb.", text: "Your rating moves with every duel you play." },
];

// The first screen and the three words behind it share one pinned stage: the poster opens
// like doors and the words are already there. All motion comes from variables set by the page.
export default function Act1({ actRef, stageRef }) {
  return (
    <section ref={actRef} className={styles.act}>
      <div ref={stageRef} className={styles.stage}>
        <header className={styles.nav}>
          <div className={styles.wrap}>
            <Logo large />
            <nav className={styles.acts} aria-label="Account">
              <Link to="/login" className={`${buttons.btn} ${buttons.nav}`}>
                Log in
              </Link>
              <Link to="/signup" className={`${buttons.btn} ${buttons.primary} ${buttons.nav}`}>
                Sign up
              </Link>
            </nav>
          </div>
        </header>

        <div className={styles.hero}>
          <div className={styles.wrap}>
            <div className={styles.top}>
              <h1 className={styles.title}>
                <span>Same problem.</span>{" "}
                <span>Two players.</span>{" "}
                <span>One clock.</span>
              </h1>
              <div className={styles.side}>
                <p className={styles.lede}>
                  A live 1v1 coding duel. You and a rival near your rating race to solve the same
                  problem, in the language you choose.
                </p>
                <ul className={styles.langs} aria-label="Languages">
                  {LANGUAGES.map((l) => (
                    <li key={l.id}>{l.name}</li>
                  ))}
                </ul>
              </div>
            </div>
            <DuelBand />
          </div>
        </div>

        <div className={styles.words}>
          <div className={styles.wrap}>
            <div className={styles.list}>
              {WORDS.map((w, i) => (
                <article key={w.id} className={styles.row} style={{ "--i": i }} data-row={i}>
                  <h2 className={styles.word}>{w.word}</h2>
                  <div>
                    <p>{w.text}</p>
                    <i className={styles.sw} />
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
