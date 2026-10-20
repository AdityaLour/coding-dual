import { useState } from "react";
import { getSessions, signOutOthers, signOutSession } from "../api.js";
import { useLoad } from "../useLoad.js";
import { whenText } from "../logic.js";
import { failText } from "./errors.js";
import p from "../Profile.module.css";
import s from "./Account.module.css";

const Icon = ({ kind }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {kind === "phone" ? (
      <>
        <rect x="7" y="2" width="10" height="20" rx="2" />
        <path d="M11 18h2" />
      </>
    ) : kind === "tablet" ? (
      <>
        <rect x="4" y="2" width="16" height="20" rx="2" />
        <path d="M11 18h2" />
      </>
    ) : (
      <>
        <rect x="3" y="4" width="18" height="12" rx="2" />
        <path d="M8 20h8M12 16v4" />
      </>
    )}
  </svg>
);

const seen = (device) => (device.current ? "This device · active now" : device.lastActiveAt ? `Last active ${whenText(device.lastActiveAt)}` : "");

// Each device is { id, label, kind, current, lastActiveAt, signedInAt }. This device is always listed, even when it is the only one,
// and never gets a Sign out button: that is what Log out is for.
export default function DevicesSection({ say }) {
  const { state, retry } = useLoad(getSessions);
  const [leaving, setLeaving] = useState(() => new Set());
  const [gone, setGone] = useState(() => new Set());
  const [busy, setBusy] = useState(false);

  function drop(ids) {
    setLeaving((previous) => new Set([...previous, ...ids]));
    setTimeout(() => setGone((previous) => new Set([...previous, ...ids])), 320);
  }

  async function out(id) {
    setBusy(true);
    try {
      await signOutSession(id);
      drop([id]);
      say("Signed out of that device.");
    } catch (error) {
      say(failText(error, "Signing out a device"));
    } finally {
      setBusy(false);
    }
  }

  async function outOthers(ids) {
    setBusy(true);
    try {
      await signOutOthers();
      drop(ids);
      say("Signed out everywhere else.");
    } catch (error) {
      say(failText(error, "Signing out your devices"));
    } finally {
      setBusy(false);
    }
  }

  if (state.status === "loading" || state.status === "idle") return <p className={s.hint}>Loading your devices…</p>;
  if (state.status === "error")
    return (
      <div>
        <p className={s.err} role="alert">
          {state.message}
        </p>
        <button type="button" className={`${p.btn} ${p.ghost} ${p.sm}`} onClick={retry}>
          Try again
        </button>
      </div>
    );

  const devices = (state.data.sessions ?? []).filter((d) => !gone.has(d.id));
  const others = devices.filter((d) => !d.current && !leaving.has(d.id));
  return (
    <>
      <p className={s.lead}>Where your account is signed in right now.</p>
      {devices.map((device) => (
        <div key={device.id} className={`${s.dev} ${leaving.has(device.id) ? s.out : ""}`}>
          <span className={s.ic}>
            <Icon kind={device.kind} />
          </span>
          <span className={s.tx}>
            <b>{device.label}</b>
            <small>{seen(device)}</small>
          </span>
          {!device.current && (
            <button type="button" className={`${p.btn} ${p.ghost} ${p.sm}`} disabled={busy} onClick={() => out(device.id)}>
              Sign out
            </button>
          )}
        </div>
      ))}
      {devices.length === 1 && <p className={s.hint}>You&apos;re not signed in anywhere else.</p>}
      {others.length > 1 && (
        <div className={s.after}>
          <button type="button" className={`${p.btn} ${p.ghost} ${p.sm}`} disabled={busy} onClick={() => outOthers(others.map((d) => d.id))}>
            Sign out all other devices
          </button>
        </div>
      )}
    </>
  );
}
