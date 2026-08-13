"use client";

import { useEffect, useRef, useState } from "react";

interface FloatingMarkdownInputProps {
  name: string;
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  minHeight?: string;
}

/** Convierte Markdown simple a HTML para inicializar el editor */
function markdownToHtml(md: string): string {
  if (!md) return "";
  const html = md
    .replace(/^###?\s+(.*)$/gm, "<h2>$1</h2>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>");

  const lines = html.split("\n");
  let inUnorderedList = false;
  let inOrderedList = false;
  const resultLines: string[] = [];

  for (const line of lines) {
    const unorderedMatch = line.match(/^[-*]\s+(.*)$/);
    const orderedMatch = line.match(/^(\d+)\.\s+(.*)$/);

    if (unorderedMatch) {
      if (inOrderedList) {
        resultLines.push("</ol>");
        inOrderedList = false;
      }
      if (!inUnorderedList) {
        resultLines.push("<ul>");
        inUnorderedList = true;
      }
      resultLines.push(`<li>${unorderedMatch[1]}</li>`);
    } else if (orderedMatch) {
      if (inUnorderedList) {
        resultLines.push("</ul>");
        inUnorderedList = false;
      }
      if (!inOrderedList) {
        resultLines.push("<ol>");
        inOrderedList = true;
      }
      resultLines.push(`<li>${orderedMatch[2]}</li>`);
    } else {
      if (inUnorderedList) {
        resultLines.push("</ul>");
        inUnorderedList = false;
      }
      if (inOrderedList) {
        resultLines.push("</ol>");
        inOrderedList = false;
      }
      if (line.trim().startsWith("<h2>")) {
        resultLines.push(line);
      } else if (line.trim()) {
        resultLines.push(`<p>${line}</p>`);
      } else {
        resultLines.push("<br>");
      }
    }
  }

  if (inUnorderedList) resultLines.push("</ul>");
  if (inOrderedList) resultLines.push("</ol>");

  return resultLines.join("");
}

/** Convierte el HTML del editor a Markdown para enviarlo en el FormData */
function htmlToMarkdown(html: string): string {
  if (!html) return "";
  const temp = document.createElement("div");
  temp.innerHTML = html;

  function processNode(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent || "";
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return "";

    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();
    const children = Array.from(el.childNodes).map(processNode).join("");

    switch (tag) {
      case "h1":
      case "h2":
      case "h3":
        return `\n## ${children}\n`;
      case "strong":
      case "b":
        return `**${children}**`;
      case "em":
      case "i":
        return `*${children}*`;
      case "ul":
        return `\n${children}\n`;
      case "ol":
        return `\n${children}\n`;
      case "li": {
        const parent = el.parentElement;
        if (parent && parent.tagName.toLowerCase() === "ol") {
          const index = Array.from(parent.children).indexOf(el) + 1;
          return `${index}. ${children}\n`;
        }
        return `- ${children}\n`;
      }
      case "p":
        return `${children}\n`;
      case "br":
        return "\n";
      case "div":
        return `${children}\n`;
      default:
        return children;
    }
  }

  const result = Array.from(temp.childNodes).map(processNode).join("");
  return result.replace(/\n{3,}/g, "\n\n").trim();
}

export function FloatingMarkdownInput({
  name,
  label,
  value,
  onChange,
  placeholder,
  minHeight = "96px",
}: FloatingMarkdownInputProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const isInternalChange = useRef(false);

  // Posición y estado del flotante de selección
  const [bubblePos, setBubblePos] = useState<{ top: number; left: number } | null>(null);
  const [activeFormats, setActiveFormats] = useState({ bold: false, italic: false });

  // Cargar HTML inicial
  useEffect(() => {
    if (isInternalChange.current) {
      isInternalChange.current = false;
      return;
    }
    if (editorRef.current) {
      editorRef.current.innerHTML = markdownToHtml(value);
    }
  }, [value]);

  // Actualiza la posición del flotante cuando el usuario selecciona texto
  const updateSelectionBubble = () => {
    if (typeof window === "undefined") return;
    const selection = window.getSelection();

    if (
      !selection ||
      selection.isCollapsed ||
      !editorRef.current ||
      !containerRef.current ||
      !editorRef.current.contains(selection.anchorNode)
    ) {
      setBubblePos(null);
      return;
    }

    const range = selection.getRangeAt(0);
    const rangeRect = range.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();

    // Posicionamos el flotante justo encima de la selección
    const top = rangeRect.top - containerRect.top - 42;
    const left = Math.max(10, rangeRect.left - containerRect.left + rangeRect.width / 2 - 40);

    setBubblePos({ top, left });

    try {
      setActiveFormats({
        bold: document.queryCommandState("bold"),
        italic: document.queryCommandState("italic"),
      });
    } catch {
      // no-op
    }
  };

  useEffect(() => {
    const handleSelectionChange = () => {
      updateSelectionBubble();
    };
    document.addEventListener("selectionchange", handleSelectionChange);
    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, []);

  const handleInput = () => {
    if (!editorRef.current) return;
    isInternalChange.current = true;
    const md = htmlToMarkdown(editorRef.current.innerHTML);
    onChange(md);
    updateSelectionBubble();
  };

  const execCmd = (cmd: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand(cmd, false);
    handleInput();
  };

  return (
    <div ref={containerRef} className="relative flex flex-col gap-1 w-full">
      <span className="text-xs font-semibold text-muted">{label}</span>
      <input type="hidden" name={name} value={value} />

      {/* Flotante de Formato (Bubble Menu) en la Selección */}
      {bubblePos && (
        <div
          style={{ top: `${bubblePos.top}px`, left: `${bubblePos.left}px` }}
          className="absolute z-30 flex items-center gap-1 rounded-lg bg-text text-bg px-1.5 py-1 shadow-lg border border-border/20 text-xs animate-pop-in pointer-events-auto"
        >
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              execCmd("bold");
            }}
            title="Negrita"
            className={[
              "flex h-6 w-6 items-center justify-center rounded text-xs font-bold transition-colors",
              activeFormats.bold
                ? "bg-primary text-white"
                : "hover:bg-bg/20 hover:text-white",
            ].join(" ")}
          >
            B
          </button>
          <div className="h-3 w-[1px] bg-bg/20" />
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              execCmd("italic");
            }}
            title="Cursiva"
            className={[
              "flex h-6 w-6 items-center justify-center rounded text-xs italic font-serif transition-colors",
              activeFormats.italic
                ? "bg-primary text-white"
                : "hover:bg-bg/20 hover:text-white",
            ].join(" ")}
          >
            I
          </button>
        </div>
      )}

      {/* Canvas WYSIWYG Editable */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onBlur={handleInput}
        onMouseUp={updateSelectionBubble}
        onKeyUp={updateSelectionBubble}
        style={{ minHeight }}
        data-placeholder={placeholder}
        className="w-full resize-y rounded-[var(--radius)] border border-border bg-bg px-3 py-2.5 text-sm text-text outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-[var(--focus-ring)] leading-relaxed [&:empty]:before:content-[attr(data-placeholder)] [&:empty]:before:text-muted [&:empty]:before:pointer-events-none [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-text [&_h2]:font-display [&_h2]:mt-2 [&_h2]:mb-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1 [&_strong]:font-bold [&_em]:italic"
      />
    </div>
  );
}
