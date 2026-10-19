import { useEffect, useRef } from "react";
import { Compartment, EditorState } from "@codemirror/state";
import {
  EditorView,
  drawSelection,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
} from "@codemirror/view";
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from "@codemirror/commands";
import {
  HighlightStyle,
  bracketMatching,
  indentOnInput,
  indentUnit,
  syntaxHighlighting,
} from "@codemirror/language";
import { closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";
import { tags as t } from "@lezer/highlight";
import { python } from "@codemirror/lang-python";

// Python is on the first screen; the other highlighters are fetched only when someone picks that language.
const SYNTAX = {
  python: async () => python(),
  cpp: async () => (await import("@codemirror/lang-cpp")).cpp(),
  java: async () => (await import("@codemirror/lang-java")).java(),
  javascript: async () =>
    (await import("@codemirror/lang-javascript")).javascript(),
};

// Night Market colours: bone for keywords, warm tones for literals, no blue.
const highlight = HighlightStyle.define([
  {
    tag: [t.keyword, t.controlKeyword, t.operatorKeyword, t.modifier],
    color: "#efe6d2",
    fontWeight: "700",
  },
  {
    tag: [
      t.definition(t.variableName),
      t.function(t.variableName),
      t.function(t.propertyName),
      t.className,
    ],
    color: "#ffffff",
  },
  { tag: [t.typeName, t.namespace], color: "#d9d2c0" },
  { tag: [t.string, t.special(t.string), t.regexp], color: "#b5c29a" },
  { tag: [t.number, t.bool, t.null, t.atom], color: "#d8b98a" },
  {
    tag: [t.comment, t.lineComment, t.blockComment],
    color: "#6f787f",
    fontStyle: "italic",
  },
  { tag: [t.operator, t.punctuation, t.bracket], color: "#9ca3a9" },
  { tag: t.meta, color: "#9ca3a9" },
]);

const theme = EditorView.theme(
  {
    "&": {
      height: "100%",
      color: "var(--text)",
      backgroundColor: "transparent",
      fontSize: "var(--code-size)",
    },
    "&.cm-focused": { outline: "none" },
    ".cm-scroller": {
      fontFamily: "var(--font-code)",
      lineHeight: "var(--code-line)",
      overflow: "auto",
    },
    ".cm-content": { padding: "16px 0", caretColor: "var(--you)" },
    ".cm-line": { padding: "0 14px 0 4px" },
    ".cm-gutters": {
      backgroundColor: "transparent",
      color: "#5c646b",
      border: "none",
    },
    ".cm-lineNumbers .cm-gutterElement": {
      padding: "0 8px 0 14px",
      minWidth: "3ch",
    },
    ".cm-activeLine": { backgroundColor: "rgba(239, 230, 210, 0.045)" },
    ".cm-activeLineGutter": {
      backgroundColor: "transparent",
      color: "var(--text-2)",
    },
    ".cm-cursor, .cm-dropCursor": {
      borderLeftColor: "var(--you)",
      borderLeftWidth: "2px",
    },
    "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground":
      {
        backgroundColor: "rgba(239, 230, 210, 0.2)",
      },
    "&.cm-focused .cm-matchingBracket": {
      backgroundColor: "rgba(239, 230, 210, 0.22)",
      outline: "1px solid rgba(239, 230, 210, 0.45)",
    },
    "&.cm-focused .cm-nonmatchingBracket": {
      backgroundColor: "transparent",
      outline: "1px solid var(--warn)",
    },
  },
  { dark: true },
);

// The code editor (CodeMirror 6, bundled with the app: nothing is fetched from a CDN).
// `docKey` identifies which document is shown (a duel + language). When it changes the editor is
// reloaded with `value` and its undo history starts fresh, so Undo never brings back another language.
export default function Editor({
  docKey,
  value,
  syntax,
  label,
  describedBy,
  className,
  onChange,
  onSubmit,
}) {
  const host = useRef(null);
  const view = useRef(null);
  const loads = useRef(0); // counts document loads, so a late highlighter for an old one can be told apart
  const syntaxSlot = useRef(new Compartment()); // where the language's highlighting plugs in once it has loaded
  const latest = useRef({
    value,
    syntax,
    label,
    describedBy,
    onChange,
    onSubmit,
  });
  useEffect(() => {
    latest.current = { value, syntax, label, describedBy, onChange, onSubmit };
  });

  // Creates the editor once, and loads a document into it whenever docKey changes.
  useEffect(() => {
    const {
      value: doc,
      syntax: language,
      label: name,
      describedBy: description,
    } = latest.current;
    const state = EditorState.create({
      doc,
      extensions: [
        // First, so it beats the default Ctrl+Enter (insert a blank line).
        keymap.of([
          {
            key: "Mod-Enter",
            preventDefault: true,
            run: () => (latest.current.onSubmit(), true),
          },
        ]),
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightActiveLine(),
        history(),
        drawSelection(),
        indentOnInput(),
        bracketMatching(),
        closeBrackets(),
        indentUnit.of("    "),
        EditorState.tabSize.of(4),
        syntaxHighlighting(highlight),
        syntaxSlot.current.of([]),
        keymap.of([
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...historyKeymap,
          indentWithTab,
        ]),
        EditorView.contentAttributes.of({
          "aria-label": name,
          "aria-describedby": description,
          autocapitalize: "off",
          autocorrect: "off",
          spellcheck: "false",
        }),
        EditorView.updateListener.of((update) => {
          if (update.docChanged)
            latest.current.onChange(update.state.doc.toString());
        }),
        theme,
      ],
    });
    if (view.current) view.current.setState(state);
    else view.current = new EditorView({ state, parent: host.current });

    // Highlighting arrives a moment later (a language other than Python is fetched on demand).
    // If another document was loaded in the meantime, this one is stale and is dropped.
    const editor = view.current;
    const load = ++loads.current;
    SYNTAX[language]()
      .then((support) => {
        if (load === loads.current && view.current === editor)
          editor.dispatch({ effects: syntaxSlot.current.reconfigure(support) });
      })
      .catch(() => {}); // no highlighting is not a reason to break the editor
  }, [docKey]);

  // Only on leaving the page.
  useEffect(
    () => () => {
      view.current?.destroy();
      view.current = null;
    },
    [],
  );

  return <div ref={host} className={className} />;
}
