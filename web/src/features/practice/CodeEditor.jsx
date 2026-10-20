import { LANGUAGES } from "@/features/duel/languages.js";
import Editor from "@/features/duel/Editor.jsx";
import s from "./CodeEditor.module.css";

const SUBMIT_KEY =
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform) ? "⌘" : "Ctrl";

// Aria-disabled, not disabled: a button you just pressed keeps focus while it judges.
function Action({ children, primary, blocked, onClick }) {
  return (
    <button
      type="button"
      className={`${s.action} ${primary ? s.primary : ""}`}
      aria-disabled={blocked}
      onClick={blocked ? undefined : onClick}
    >
      {children}
    </button>
  );
}

// Language, Run, Submit and the editor. The code itself lives in the parent; this only shows it.
export default function CodeEditor({ languageId, onLanguage, doc, syntax, judging, flash, onTyped, onRun, onSubmit }) {
  return (
    <>
      <div className={s.toolbar}>
        <label className={s.language}>
          <span className={s.word}>Language</span>
          <select value={languageId} onChange={(event) => onLanguage(Number(event.target.value))}>
            {LANGUAGES.map(({ id, name }) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <span className={s.spacer} />
        <span className={s.keys}>
          <kbd>{SUBMIT_KEY}</kbd>+<kbd>Enter</kbd>
        </span>
        <Action blocked={judging} onClick={onRun}>
          Run
        </Action>
        <Action primary blocked={judging} onClick={onSubmit}>
          {judging ? "Judging…" : "Submit"}
        </Action>
      </div>
      <div className={s.editor} data-flash={flash === 0 ? "none" : flash % 2 ? "a" : "b"}>
        {judging && <span className={s.scan} aria-hidden="true" />}
        <Editor
          className={s.cm}
          docKey={doc.key}
          value={doc.value}
          syntax={syntax}
          label="Your code"
          describedBy="practice-editor-help"
          onChange={onTyped}
          onSubmit={onSubmit}
        />
        <p id="practice-editor-help" className="sr-only">
          Tab indents. To leave the editor with the keyboard, press Escape, then Tab. {SUBMIT_KEY} plus Enter submits.
        </p>
      </div>
    </>
  );
}
