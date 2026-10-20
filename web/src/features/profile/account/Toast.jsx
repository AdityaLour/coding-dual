import { useEffect } from "react";
import s from "./Account.module.css";

// One short confirmation at the bottom of the screen. `toast` is { id, message }; a new id shows again.
export default function Toast({ toast, onDone }) {
  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(onDone, 4200);
    return () => clearTimeout(timer);
  }, [toast, onDone]);
  return (
    <div role="status" aria-live="polite">
      {toast && (
        <div key={toast.id} className={s.toast}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
