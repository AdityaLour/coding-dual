import { topicName } from "@/features/practice/topics.js";
import styles from "./Practice.module.css";

const ROW_ONE = ["arrays-hashing", "strings", "two-pointers-window", "linked-lists", "stack-queue", "binary-search", "sorting-greedy"];
const ROW_TWO = ["bits-math", "trees", "heaps", "backtracking", "graphs", "dynamic-programming"];

// Each row holds four copies of its topics: the track slides left by one copy and starts over,
// so the loop never shows a gap, however wide the screen is.
function Row({ slugs, reverse }) {
  return (
    <div className={`${styles.mq} ${reverse ? styles.reverse : styles.large}`} aria-hidden="true">
      <div className={styles.shift}>
        <div className={styles.track}>
          {[0, 1, 2, 3].map((copy) =>
            slugs.map((slug) => (
              <span key={`${copy}-${slug}`} className={styles.topic}>
                {topicName(slug)}
              </span>
            )),
          )}
        </div>
      </div>
    </div>
  );
}

export default function Practice({ sectionRef }) {
  return (
    <section ref={sectionRef} className={styles.section}>
      <div className={styles.wrap}>
        <div className={styles.head}>
          <div>
            <p className={styles.caption}>No rival online?</p>
            <h2 className={styles.title}>Practice.</h2>
          </div>
          <p className={styles.text}>150 problems across 13 topics, in the order a beginner learns them.</p>
        </div>
        <Row slugs={ROW_ONE} />
        <Row slugs={ROW_TWO} reverse />
      </div>
    </section>
  );
}
