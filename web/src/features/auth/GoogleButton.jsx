import { useEffect, useRef, useState } from "react";
import s from "./GoogleButton.module.css";

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const SCRIPT_URL = "https://accounts.google.com/gsi/client";

// Google's script is loaded once, only on pages that show the button, and initialised once.
// The callback always forwards to whichever button is currently on screen.
let scriptPromise;
let forward = () => {};

function loadGoogle() {
  scriptPromise ??= new Promise((resolve, reject) => {
    const tag = document.createElement("script");
    tag.src = SCRIPT_URL;
    tag.async = true;
    tag.onload = () => {
      window.google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: (response) => forward(response.credential),
      });
      resolve(window.google);
    };
    tag.onerror = () => {
      scriptPromise = undefined; // allow a later retry
      tag.remove();
      reject(new Error("Google script failed to load"));
    };
    document.head.append(tag);
  });
  return scriptPromise;
}

// Google's official button (rendered by Google, so only its preset options can change it).
// Dark pill: fits the Night Market theme without a custom OAuth flow.
// text: "signin_with" | "signup_with" | "continue_with"
export default function GoogleButton({ text, onCredential }) {
  const slot = useRef(null);
  const [state, setState] = useState(CLIENT_ID ? "loading" : "unavailable");

  useEffect(() => {
    forward = onCredential;
  });

  useEffect(() => {
    if (!CLIENT_ID) return;
    let alive = true;
    loadGoogle()
      .then((google) => {
        if (!alive || !slot.current) return;
        google.accounts.id.renderButton(slot.current, {
          type: "standard",
          theme: "filled_black",
          size: "large",
          shape: "pill",
          text,
          logo_alignment: "center",
          width: Math.max(200, Math.min(400, slot.current.offsetWidth)),
        });
        setState("ready");
      })
      .catch(() => alive && setState("unavailable"));
    return () => {
      alive = false;
    };
  }, [text]);

  if (state === "unavailable") {
    return (
      <p className={s.note}>Google sign-in isn&apos;t available right now.</p>
    );
  }
  return <div ref={slot} className={s.slot} aria-busy={state === "loading"} />;
}
