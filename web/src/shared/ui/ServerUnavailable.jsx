import Logo from "./Logo.jsx";
import { useAuth } from "@/shared/auth/useAuth.js";
import s from "./ErrorBoundary.module.css";

// Shown on signed-in pages when the backend can't be reached, instead of logging people out.
export default function ServerUnavailable() {
  const { retry } = useAuth();
  return (
    <main className={s.page}>
      <title>Can't connect — Boip</title>
      <Logo />
      <div className={s.body}>
        <h1 className={s.title}>Can&apos;t reach Boip.</h1>
        <p className={s.text}>
          The server isn&apos;t responding. Check your connection, then try
          again.
        </p>
        <div className={s.actions}>
          <button type="button" className="btn btn-primary" onClick={retry}>
            Try again
          </button>
        </div>
      </div>
    </main>
  );
}
