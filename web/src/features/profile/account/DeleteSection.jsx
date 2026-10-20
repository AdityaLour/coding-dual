import { useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@/shared/auth/useAuth.js";
import { deleteAccount } from "../api.js";
import { failText } from "./errors.js";
import p from "../Profile.module.css";
import s from "./Account.module.css";

export default function DeleteSection({ username }) {
  const navigate = useNavigate();
  const { signedOut } = useAuth();
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const ready = typed.trim().toLowerCase() === username.toLowerCase();

  async function remove() {
    setBusy(true);
    setMessage("");
    try {
      await deleteAccount(username);
      navigate("/", { replace: true });
      signedOut();
    } catch (error) {
      setMessage(failText(error, "Deleting your account"));
      setBusy(false);
    }
  }

  return (
    <section className={`${s.card} ${s.sec} ${s.dangerSec}`} id="acct-delete" aria-label="Delete account">
      <details className={s.del}>
        <summary>Delete account</summary>
        <p className={s.hint} style={{ margin: "6px 0 16px" }}>
          This removes your profile, duel history and practice progress for good. It can&apos;t be undone.
        </p>
        <div className={s.f}>
          <label htmlFor="acct-confirm">
            Type <b className={s.mono}>{username}</b> to confirm
          </label>
          <div className={s.inp}>
            <input
              id="acct-confirm"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
            />
          </div>
        </div>
        {message && (
          <p className={s.err} role="alert">
            {message}
          </p>
        )}
        <button type="button" className={`${p.btn} ${p.danger} ${p.sm}`} disabled={!ready || busy} onClick={remove}>
          {busy ? "Deleting…" : "Delete my account"}
        </button>
      </details>
    </section>
  );
}
