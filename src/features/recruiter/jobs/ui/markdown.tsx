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

/** Convierte sintaxis de negrita (**texto**) e itálica (*texto*) a nodos React formateados (strong/em). */
export function renderFormattedText(text: string): ReactNode {
  if (!text) return null;

  const parts: ReactNode[] = [];
  const regex = /(\*\*.*?\*\*|\*.*?\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }

    const token = match[0];
    if (token.startsWith("**") && token.endsWith("**") && token.length >= 4) {
      parts.push(
        <strong key={match.index} className="font-bold text-text">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith("*") && token.endsWith("*") && token.length >= 2) {
      parts.push(
        <em key={match.index} className="italic">
          {token.slice(1, -1)}
        </em>
      );
    } else {
      parts.push(token);
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length === 1 ? parts[0] : parts;
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
              {renderFormattedText(block.text)}
            </h3>
          );
        }
        if (block.type === "list") {
          return (
            <ul key={i} className="list-disc space-y-1 pl-5">
              {block.items.map((item, j) => (
                <li key={j}>{renderFormattedText(item)}</li>
              ))}
            </ul>
          );
        }
        return <p key={i}>{renderFormattedText(block.text)}</p>;
      })}
    </div>
  );
}
