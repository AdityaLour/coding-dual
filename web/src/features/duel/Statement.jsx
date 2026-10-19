import { Fragment, useMemo } from "react";
import { parseStatement } from "./statement.js";
import s from "./ProblemPane.module.css";

const Inline = ({ parts }) =>
  parts.map((part, index) => {
    switch (part.type) {
      case "code":
        return <code key={index}>{part.text}</code>;
      case "bold":
        return <strong key={index}>{part.text}</strong>;
      case "italic":
        return <em key={index}>{part.text}</em>;
      default:
        return <Fragment key={index}>{part.text}</Fragment>;
    }
  });

// A problem statement as React elements. It only ever creates text nodes and plain tags,
// never HTML from the statement itself.
export default function Statement({ text }) {
  const blocks = useMemo(() => parseStatement(text), [text]);
  return blocks.map((block, index) => {
    switch (block.type) {
      case "heading":
        return (
          <h2 key={index} className={s.heading}>
            {block.text}
          </h2>
        );
      case "list":
        return (
          <ul key={index} className={s.list}>
            {block.items.map((item, at) => (
              <li key={at}>
                <Inline parts={item} />
              </li>
            ))}
          </ul>
        );
      default:
        return (
          <p key={index} className={s.paragraph}>
            <Inline parts={block.parts} />
          </p>
        );
    }
  });
}
