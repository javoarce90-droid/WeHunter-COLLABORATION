"use client";

import { useEffect, useRef, useState } from "react";

const QUICK_EMOJIS = [
  "🚀", "💻", "🎯", "⭐", "🔥", "💼", "✅", "💡", 
  "👥", "📈", "🏆", "🌟", "🤝", "📍", "💰", "🎓", 
  "⚡", "📝", "📣", "🎁", "❤️", "🙌", "✨", "📌"
];

interface RichMarkdownInputProps {
  name: string;
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  minHeight?: string;
}

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

export function RichMarkdownInput({
  name,
  label,
  value,
  onChange,
  placeholder,
  minHeight = "120px",
}: RichMarkdownInputProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const isInternalChange = useRef(false);

  // Estado de formatos activos en el cursor
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    h2: false,
    ul: false,
    ol: false,
  });

  const updateActiveFormats = () => {
    if (!editorRef.current) return;
    try {
      const isBold = document.queryCommandState("bold");
      const isItalic = document.queryCommandState("italic");
      const isUl = document.queryCommandState("insertUnorderedList");
      const isOl = document.queryCommandState("insertOrderedList");

      const block = document.queryCommandValue("formatBlock");
      const isH2 = block === "h2" || block === "H2";

      setActiveFormats({
        bold: isBold,
        italic: isItalic,
        h2: isH2,
        ul: isUl,
        ol: isOl,
      });
    } catch {
      // no-op en entornos SSR o testing
    }
  };

  useEffect(() => {
    if (isInternalChange.current) {
      isInternalChange.current = false;
      return;
    }
    if (editorRef.current) {
      editorRef.current.innerHTML = markdownToHtml(value);
    }
  }, [value]);

  const handleInput = () => {
    if (!editorRef.current) return;
    isInternalChange.current = true;
    const md = htmlToMarkdown(editorRef.current.innerHTML);
    onChange(md);
    updateActiveFormats();
  };

  const execCmd = (cmd: string, arg: string | undefined = undefined) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand(cmd, false, arg);
    handleInput();
    updateActiveFormats();
  };

  const insertEmoji = (emoji: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand("insertText", false, emoji);
    handleInput();
    setShowEmojiPicker(false);
    updateActiveFormats();
  };

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border/80 bg-surface p-3.5 transition-all hover:border-primary/40 focus-within:border-primary/60 shadow-xs">
      <input type="hidden" name={name} value={value} />

      {/* Header del Toolbar Interactivo */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2.5">
        <label className="text-xs font-bold text-text font-display">{label}</label>

        <div className="flex flex-wrap items-center gap-1.5">
          {/* Formatos de texto */}
          <div className="flex items-center gap-0.5 rounded-lg bg-bg p-1 border border-border/60">
            {/* Negrita */}
            <button
              type="button"
              onClick={() => execCmd("bold")}
              title="Negrita"
              className={[
                "flex h-7 w-7 items-center justify-center rounded text-xs font-bold transition-all",
                activeFormats.bold
                  ? "bg-primary text-white shadow-xs"
                  : "text-text hover:bg-surface hover:text-primary",
              ].join(" ")}
            >
              B
            </button>

            {/* Cursiva */}
            <button
              type="button"
              onClick={() => execCmd("italic")}
              title="Cursiva"
              className={[
                "flex h-7 w-7 items-center justify-center rounded text-xs italic font-serif transition-all",
                activeFormats.italic
                  ? "bg-primary text-white shadow-xs"
                  : "text-text hover:bg-surface hover:text-primary",
              ].join(" ")}
            >
              I
            </button>

            {/* Encabezado H2 */}
            <button
              type="button"
              onClick={() => execCmd("formatBlock", "<h2>")}
              title="Título / Encabezado"
              className={[
                "flex h-7 px-2 items-center justify-center rounded text-[11px] font-bold transition-all",
                activeFormats.h2
                  ? "bg-primary text-white shadow-xs"
                  : "text-text hover:bg-surface hover:text-primary",
              ].join(" ")}
            >
              H2
            </button>

            {/* Viñetas con icono de 3 puntitos */}
            <button
              type="button"
              onClick={() => execCmd("insertUnorderedList")}
              title="Lista de viñetas"
              className={[
                "flex h-7 w-7 items-center justify-center rounded transition-all",
                activeFormats.ul
                  ? "bg-primary text-white shadow-xs"
                  : "text-text hover:bg-surface hover:text-primary",
              ].join(" ")}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="9" y1="6" x2="20" y2="6"></line>
                <line x1="9" y1="12" x2="20" y2="12"></line>
                <line x1="9" y1="18" x2="20" y2="18"></line>
                <circle cx="4" cy="6" r="1.2" fill="currentColor"></circle>
                <circle cx="4" cy="12" r="1.2" fill="currentColor"></circle>
                <circle cx="4" cy="18" r="1.2" fill="currentColor"></circle>
              </svg>
            </button>

            {/* Numeración con icono de 1, 2, 3 */}
            <button
              type="button"
              onClick={() => execCmd("insertOrderedList")}
              title="Lista numerada"
              className={[
                "flex h-7 w-7 items-center justify-center rounded transition-all",
                activeFormats.ol
                  ? "bg-primary text-white shadow-xs"
                  : "text-text hover:bg-surface hover:text-primary",
              ].join(" ")}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="10" y1="6" x2="21" y2="6"></line>
                <line x1="10" y1="12" x2="21" y2="12"></line>
                <line x1="10" y1="18" x2="21" y2="18"></line>
                <path d="M4 6h1v4"></path>
                <path d="M4 10h2"></path>
                <path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"></path>
              </svg>
            </button>
          </div>

          {/* Selector de Emojis */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowEmojiPicker((v) => !v)}
              title="Agregar emoji"
              className="flex h-7 px-2.5 items-center gap-1.5 rounded-lg bg-bg border border-border/60 text-xs font-semibold text-text hover:bg-surface hover:text-primary transition-colors"
            >
              <span>😊</span>
              <span className="text-[11px]">Emoji</span>
            </button>

            {/* Popover de Emojis */}
            {showEmojiPicker && (
              <div className="absolute right-0 top-full mt-1.5 z-20 w-64 rounded-xl border border-border bg-surface p-2.5 shadow-lg animate-pop-in">
                <div className="flex items-center justify-between mb-2 pb-1 border-b border-border/60">
                  <span className="text-[11px] font-bold text-muted uppercase tracking-wide">Seleccionar Emoji</span>
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(false)}
                    className="text-muted hover:text-text text-xs font-bold px-1"
                  >
                    ✕
                  </button>
                </div>
                <div className="grid grid-cols-6 gap-1 max-h-36 overflow-y-auto">
                  {QUICK_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => insertEmoji(emoji)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-base hover:bg-primary-light/50 hover:scale-110 transition-transform"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Canvas WYSIWYG Estilo Google Docs */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onBlur={handleInput}
        onKeyUp={updateActiveFormats}
        onMouseUp={updateActiveFormats}
        onFocus={updateActiveFormats}
        style={{ minHeight }}
        data-placeholder={placeholder}
        className="outline-none focus:outline-none p-2 rounded-lg bg-surface text-sm text-text transition-colors leading-relaxed [&:empty]:before:content-[attr(data-placeholder)] [&:empty]:before:text-muted [&:empty]:before:pointer-events-none [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-text [&_h2]:font-display [&_h2]:mt-3 [&_h2]:mb-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_ul]:my-1.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1 [&_ol]:my-1.5 [&_strong]:font-bold [&_em]:italic"
      />
    </div>
  );
}
