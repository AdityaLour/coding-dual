import { useEffect, useRef, useState } from "react";
import s from "./InviteLink.module.css";

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

// Create-a-link flow: button → invite code → copy.
// Private duels aren't in the backend yet: development shows a local demo code,
// a production build says it isn't available instead of faking one.
export default function InviteLink() {
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [note, setNote] = useState("");
  const [flying, setFlying] = useState(0);
  const timer = useRef(0);

  useEffect(() => () => clearTimeout(timer.current), []);

  function create() {
    if (!import.meta.env.DEV) {
      setNote("Private duels aren't available yet.");
      return;
    }
    const bytes = crypto.getRandomValues(new Uint8Array(4));
    setCode(Array.from(bytes, (b) => CHARS[b % CHARS.length]).join(""));
  }

  async function copy() {
    clearTimeout(timer.current);
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setFlying((n) => n + 1);
    } catch {
      // Clipboard blocked: say so, the code stays visible to copy by hand.
      setCopied("failed");
    }
    timer.current = setTimeout(() => setCopied(false), 1800);
  }

  if (!code) {
    return (
      <div className={s.wrap}>
        <button type="button" className={s.create} onClick={create}>
          Create a link
        </button>
        <p className={s.note} aria-live="polite">
          {note}
        </p>
      </div>
    );
  }

  return (
    <div className={s.chip}>
      <span className={s.label}>
        Invite code <b className={s.code}>{code}</b>
      </span>
      <button
        type="button"
        className={`${s.copy} ${copied === true ? s.done : ""}`}
        onClick={copy}
      >
        {copied === true
          ? "Copied"
          : copied === "failed"
            ? "Copy it by hand"
            : "Copy"}
      </button>
      {flying > 0 && (
        <svg
          key={flying}
          className={s.plane}
          width="34"
          height="34"
          viewBox="0 0 34 34"
          aria-hidden="true"
        >
          <path
            d="M3 16 L31 4 L22 30 L16 19 Z M16 19 L31 4"
            fill="none"
            stroke="var(--you)"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
        </svg>
      )}
      <span className="visually-hidden" aria-live="polite">
        {copied === true
          ? "Invite code copied"
          : copied === "failed"
            ? "Could not copy automatically"
            : ""}
      </span>
    </div>
  );
}
