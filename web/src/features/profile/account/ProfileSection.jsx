import DoodleFace from "@/shared/ui/DoodleFace.jsx";
import s from "./Account.module.css";

export default function ProfileSection({ username }) {
  return (
    <section className={`${s.card} ${s.sec}`} id="acct-profile" aria-labelledby="h-profile">
      <h2 id="h-profile">Profile</h2>
      <div className={s.kv}>
        <span className={s.k}>Face</span>
        <span className={s.v}>
          <DoodleFace size={44} />
          <span className={s.soft}>Picked for you, so it matches the leaderboard.</span>
        </span>
      </div>
      <div className={s.f}>
        <label htmlFor="acct-username">Username</label>
        <div className={s.inp}>
          <input id="acct-username" value={username} readOnly aria-describedby="acct-username-hint" />
        </div>
        <p className={s.hint} id="acct-username-hint">
          Usernames are public and can&apos;t be changed yet.
        </p>
      </div>
    </section>
  );
}
