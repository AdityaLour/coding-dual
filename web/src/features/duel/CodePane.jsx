import { useEffect, useRef, useState } from "react";
import { useDuel } from "./duelContext.js";
import { MAX_ATTEMPTS } from "./limits.js";
import { LANGUAGES, languageById } from "./languages.js";
import {
  readDraft,
  readLanguage,
  writeDraft,
  writeLanguage,
} from "./drafts.js";
import Editor from "./Editor.jsx";
import Verdict from "./Verdict.jsx";
import ResignDialog from "./ResignDialog.jsx";
import s from "./CodePane.module.css";

const SAVE_DRAFT_MS = 400;
const SUBMIT_KEY =
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform)
    ? "⌘"
    : "Ctrl";

// The document for a language in this duel: what was typed before a reload, or the starting file.
const load = (duelId, languageId) => ({
  key: `${duelId}:${languageId}`,
  value: readDraft(duelId, languageId) ?? languageById(languageId).starter,
});

// aria-disabled (not disabled) so a button you just clicked keeps focus while it judges.
function SubmitButton({ className, judging, spent, onClick }) {
  const blocked = judging || spent;
  return (
    <button
      type="button"
      className={`${s.submit} ${className}`}
      aria-disabled={blocked}
      onClick={blocked ? undefined : onClick}
    >
      {spent ? "No attempts left" : judging ? "Judging…" : "Submit"}
      {judging && <span className={s.run} aria-hidden="true" />}
    </button>
  );
}

// The right-hand side of the duel: language, editor, verdict, submit and resign.
export default function CodePane({ className = "", ...panel }) {
  const { duel, attempts, judging, notice, submit, forfeit } = useDuel();
  const duelId = duel.duelId;
  const [languageId, setLanguageId] = useState(readLanguage);
  const [doc, setDoc] = useState(() => load(duelId, languageId));
  const [asking, setAsking] = useState(false);
  const [resigning, setResigning] = useState(false);
  const source = useRef(doc.value); // the code as typed; kept out of state so typing never re-renders this
  const saveTimer = useRef(0);
  const where = useRef({ duelId, languageId });
  useEffect(() => {
    where.current = { duelId, languageId };
  });

  const saveNow = () => {
    clearTimeout(saveTimer.current);
    writeDraft(where.current.duelId, where.current.languageId, source.current);
  };
  useEffect(() => () => clearTimeout(saveTimer.current), []);

  const typed = (text) => {
    source.current = text;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(saveNow, SAVE_DRAFT_MS);
  };
  const pick = (id) => {
    saveNow();
    writeLanguage(id);
    const next = load(duelId, id);
    source.current = next.value;
    setLanguageId(id);
    setDoc(next);
  };
  const sendCode = () => submit(source.current, languageId);

  const language = languageById(languageId);
  const last = attempts.at(-1);
  const spent = duel.attemptsLeft <= 0;

  return (
    <section className={`${s.pane} ${className}`} {...panel}>
      <div className={s.toolbar}>
        <label className={s.language}>
          Language
          <select
            value={languageId}
            onChange={(event) => pick(Number(event.target.value))}
          >
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
        <span className={s.attempts}>
          <span key={duel.attemptsLeft} className={s.count}>
            {duel.attemptsLeft}
          </span>{" "}
          of {MAX_ATTEMPTS} left
        </span>
        <SubmitButton
          className={s.inToolbar}
          judging={judging}
          spent={spent}
          onClick={sendCode}
        />
      </div>

      <div
        className={s.editor}
        data-judging={judging}
        data-accepted={Boolean(last?.correct) && !judging}
      >
        {judging && (
          <span className={s.scan} aria-hidden="true">
            <span />
          </span>
        )}
        <Editor
          className={s.cm}
          docKey={doc.key}
          value={doc.value}
          syntax={language.syntax}
          label="Your code"
          describedBy="editor-help"
          onChange={typed}
          onSubmit={sendCode}
        />
        <p id="editor-help" className="sr-only">
          Tab indents. To leave the editor with the keyboard, press Escape, then
          Tab. {SUBMIT_KEY} plus Enter submits your code.
        </p>
      </div>

      <div className={s.footer}>
        <Verdict judging={judging} notice={notice} last={last} />
        <button
          type="button"
          className={s.resign}
          onClick={() => setAsking(true)}
          aria-disabled={resigning}
        >
          {resigning ? "Resigning…" : "Resign"}
        </button>
      </div>

      <div className={s.submitBar}>
        <SubmitButton
          className={s.inBar}
          judging={judging}
          spent={spent}
          onClick={sendCode}
        />
      </div>

      <ResignDialog
        open={asking}
        onCancel={() => setAsking(false)}
        onConfirm={() => {
          setAsking(false);
          setResigning(forfeit());
        }}
      />
    </section>
  );
}
