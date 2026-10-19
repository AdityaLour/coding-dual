import { useEffect, useRef } from "react";
import s from "./ResignDialog.module.css";

// "Are you sure?" for Resign. A native <dialog>: the browser traps focus inside it, Escape closes it,
// and everything behind it is inert while it is open.
export default function ResignDialog({ open, onCancel, onConfirm }) {
  const dialog = useRef(null);

  useEffect(() => {
    const element = dialog.current;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);

  return (
    <dialog
      ref={dialog}
      className={s.dialog}
      aria-labelledby="resign-title"
      aria-describedby="resign-text"
      onClose={onCancel}
      onClick={(event) => event.target === dialog.current && onCancel()} // a click on the dimmed backdrop
    >
      <h2 id="resign-title" className={s.title}>
        Resign this duel?
      </h2>
      <p id="resign-text" className={s.text}>
        It counts as a loss, and your rival wins.
      </p>
      <div className={s.actions}>
        <button type="button" className={s.keep} onClick={onCancel} autoFocus>
          Keep playing
        </button>
        <button type="button" className={s.resign} onClick={onConfirm}>
          Resign
        </button>
      </div>
    </dialog>
  );
}
