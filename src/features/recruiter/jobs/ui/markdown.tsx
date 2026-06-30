import type { ReactNode } from "react";

type MarkdownBlock =
  | { type: "heading"; text: string }
  | { type: "list"; items: string[] }
  | { type: "paragraph"; text: string };

export function parseJobMarkdown(source: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  let listItems: string[] = [];
  let paragraphLines: string[] = [];

  const flushList = () => {
    if (listItems.length) {
      blocks.push({ type: "list", items: listItems });
      listItems = [];
    }
  };
  const flushParagraph = () => {
    if (paragraphLines.length) {
      blocks.push({ type: "paragraph", text: paragraphLines.join(" ") });
      paragraphLines = [];
    }
  };

  for (const raw of source.split("\n")) {
    const line = raw.trim();
    if (!line) {
      flushList();
      flushParagraph();
      continue;
    }
    const heading = line.match(/^#{2,3}\s+(.*)/);
    if (heading) {
      flushList();
      flushParagraph();
      blocks.push({ type: "heading", text: heading[1] });
      continue;
    }
    const bullet = line.match(/^[-*]\s+(.*)/);
    if (bullet) {
      flushParagraph();
      listItems.push(bullet[1]);
      continue;
    }
    flushList();
    paragraphLines.push(line);
  }
  flushList();
  flushParagraph();
  return blocks;
}

export function JobMarkdown({ text, className }: { text: string | null | undefined; className?: string }) {
  if (!text?.trim()) return null;
  const blocks = parseJobMarkdown(text);
  if (!blocks.length) return null;

  return (
    <div className={["flex flex-col gap-2", className].filter(Boolean).join(" ")}>
      {blocks.map((block, i): ReactNode => {
        if (block.type === "heading") {
          return (
            <h3 key={i} className="text-sm font-bold text-text">
              {block.text}
            </h3>
          );
        }
        if (block.type === "list") {
          return (
            <ul key={i} className="list-disc space-y-1 pl-5">
              {block.items.map((item, j) => (
                <li key={j}>{item}</li>
              ))}
            </ul>
          );
        }
        return <p key={i}>{block.text}</p>;
      })}
    </div>
  );
}
