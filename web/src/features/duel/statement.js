// Problem statements are small Markdown: "## Heading", paragraphs, "- bullets", `code`, **bold**, *italic*.
// This turns one into plain data. Nothing here produces HTML, so a statement can never inject markup.

const INLINE = /`([^`]+)`|\*\*(\S(?:.*?\S)?)\*\*|\*(\S(?:.*?\S)?)\*/g;

// "Is `i < j` **different**?" -> [{ type: "text" | "code" | "bold" | "italic", text }]
export function parseInline(text) {
  const parts = [];
  let last = 0;
  for (const match of text.matchAll(INLINE)) {
    if (match.index > last)
      parts.push({ type: "text", text: text.slice(last, match.index) });
    const [, code, bold, italic] = match;
    parts.push(
      code
        ? { type: "code", text: code }
        : bold
          ? { type: "bold", text: bold }
          : { type: "italic", text: italic },
    );
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push({ type: "text", text: text.slice(last) });
  return parts;
}

// -> [{ type: "heading", text } | { type: "paragraph", parts } | { type: "list", items: [parts] }]
export function parseStatement(source) {
  const blocks = [];
  let paragraph = [];
  const flush = () => {
    if (paragraph.length > 0)
      blocks.push({
        type: "paragraph",
        parts: parseInline(paragraph.join(" ")),
      });
    paragraph = [];
  };
  for (const raw of String(source ?? "")
    .replace(/\r\n/g, "\n")
    .split("\n")) {
    const line = raw.trim();
    const heading = /^#{1,3}\s+(.+)$/.exec(line);
    const bullet = /^[-*]\s+(.+)$/.exec(line);
    if (line === "") flush();
    else if (heading) {
      flush();
      blocks.push({ type: "heading", text: heading[1] });
    } else if (bullet) {
      flush();
      const item = parseInline(bullet[1]);
      const last = blocks.at(-1);
      if (last?.type === "list") last.items.push(item);
      else blocks.push({ type: "list", items: [item] });
    } else paragraph.push(line);
  }
  flush();
  return blocks;
}
