import { useEffect, useRef, useState } from "react";
import { languageById } from "@/features/duel/languages.js";
import { readDraft, readLanguage, writeDraft, writeLanguage } from "@/features/duel/drafts.js";
import CodeEditor from "./CodeEditor.jsx";
import ResultPanel from "./ResultPanel.jsx";
import SolveProblem from "./SolveProblem.jsx";
import { useSolver } from "./useSolver.js";
import s from "./SolveView.module.css";

const SAVE_DRAFT_MS = 400;

// What the editor shows for a language: what was typed before a reload, or the starting file.
const load = (draftKey, languageId) => ({
  key: `${draftKey}:${languageId}`,
  value: readDraft(draftKey, languageId) ?? languageById(languageId).starter,
});

// One problem, ready to solve: statement, editor, and the result panel.
export default function SolveView({ problem, onSolved }) {
  const draftKey = `practice:${problem.slug}`;
  const solver = useSolver(problem.slug, onSolved);
  const [languageId, setLanguageId] = useState(readLanguage);
  const [doc, setDoc] = useState(() => load(draftKey, languageId));
  const [flash, setFlash] = useState(0);
  const source = useRef(doc.value); // the code as typed; kept out of state so typing never re-renders this
  const saveTimer = useRef(0);
  const where = useRef({ draftKey, languageId });
  useEffect(() => {
    where.current = { draftKey, languageId };
  });

  const saveNow = () => {
    clearTimeout(saveTimer.current);
    writeDraft(where.current.draftKey, where.current.languageId, source.current);
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
    const next = load(draftKey, id);
    source.current = next.value;
    setLanguageId(id);
    setDoc(next);
  };

  // "View code": an earlier attempt goes into the editor, in the language it was written in.
  const openAttempt = async (id) => {
    try {
      const attempt = await solver.loadCode(id);
      saveNow();
      writeLanguage(attempt.languageId);
      source.current = attempt.source;
      setLanguageId(attempt.languageId);
      setDoc({ key: `${draftKey}:${attempt.languageId}:attempt${attempt.id}`, value: attempt.source });
      setFlash((n) => n + 1);
      writeDraft(draftKey, attempt.languageId, attempt.source);
    } catch {
      /* the list stays as it is; the person can press it again */
    }
  };
  const isDirty = () => source.current.trim() !== languageById(languageId).starter.trim();

  return (
    <div className={s.solve}>
      <SolveProblem problem={problem} />
      <section className={s.code} aria-label="Your code">
        <CodeEditor
          languageId={languageId}
          onLanguage={pick}
          doc={doc}
          syntax={languageById(languageId).syntax}
          judging={solver.judging}
          flash={flash}
          onTyped={typed}
          onRun={() => solver.run(languageId, source.current)}
          onSubmit={() => solver.submit(languageId, source.current)}
        />
        <ResultPanel
          phase={solver.phase}
          history={solver.history}
          samples={problem.samples}
          next={solver.next}
          isDirty={isDirty}
          onLoad={openAttempt}
        />
      </section>
    </div>
  );
}
