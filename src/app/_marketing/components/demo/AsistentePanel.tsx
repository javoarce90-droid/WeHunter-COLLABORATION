"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { ReactNode } from "react";

export interface AsistenteAutoDemoHandle {
  runAutoDemo: () => void;
}

const AUTO_DEMO_MESSAGE = "Resumime el pipeline de Acme Corp";

const SUGGESTIONS = [
  "Buscame Python senior en mi pool",
  "Resumime el pipeline de Acme Corp",
  "Generame una boolean para LinkedIn",
];

const RESPONSES: Record<string, ReactNode> = {
  "Buscame Python senior en mi pool": (
    <>
      <div className="dw-lbl" style={{ marginBottom: 6 }}>Encontré 3 candidatos:</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div className="dw-av" style={{ width: 26, height: 26, fontSize: 10 }}>ML</div>
          <div style={{ flex: 1, fontSize: 12, fontWeight: 600, color: "#111" }}>María López</div>
          <span style={{ fontSize: 11, color: "#15803d", fontWeight: 700 }}>94%</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div className="dw-av" style={{ width: 26, height: 26, fontSize: 10 }}>LM</div>
          <div style={{ flex: 1, fontSize: 12, fontWeight: 600, color: "#111" }}>Lucas Méndez</div>
          <span style={{ fontSize: 11, color: "#6d28d9", fontWeight: 700 }}>92%</span>
        </div>
      </div>
    </>
  ),
  "Resumime el pipeline de Acme Corp": (
    <>
      18 días activa · 6 candidatos en juego. Luciana G. es la finalista más fuerte — 91%
      match. Diego espera respuesta de oferta hace 3 días.{" "}
      <strong>¿Le mando un follow-up al cliente?</strong>
    </>
  ),
  "Generame una boolean para LinkedIn": (
    <>
      <div className="dw-lbl" style={{ marginBottom: 6 }}>Boolean string generada ✦</div>
      <div
        style={{
          background: "#f8f7fd",
          border: "1px solid #ede9fe",
          borderRadius: 7,
          padding: "8px 10px",
          fontFamily: "monospace",
          fontSize: 11,
          color: "#374151",
          lineHeight: 1.5,
        }}
      >
        (&quot;Python developer&quot; OR &quot;Backend engineer&quot;) AND (Django OR FastAPI)
        AND &quot;Buenos Aires&quot; NOT junior
      </div>
    </>
  ),
};

const DEFAULT_RESPONSE =
  "Entendido. Estoy procesando tu pedido — en un momento tenés el resultado.";

interface Message {
  id: number;
  role: "user" | "bot";
  content: ReactNode;
}

let nextId = 1;

export const AsistentePanel = forwardRef<AsistenteAutoDemoHandle>(function AsistentePanel(
  _props,
  ref,
) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 0,
      role: "bot",
      content:
        "Hola Sofi! ¿En qué te ayudo? Puedo buscar candidatos, resumir pipelines, generar queries booleanas o redactar mensajes.",
    },
  ]);
  const [typing, setTyping] = useState(false);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 99999;
  }, [messages, typing]);

  useImperativeHandle(
    ref,
    () => ({
      runAutoDemo() {
        setInput("");
        let i = 0;
        const typeInterval = setInterval(() => {
          i++;
          setInput(AUTO_DEMO_MESSAGE.slice(0, i));
          if (i >= AUTO_DEMO_MESSAGE.length) {
            clearInterval(typeInterval);
            timeoutRef.current = setTimeout(() => send(AUTO_DEMO_MESSAGE), 400);
          }
        }, 40);
      },
    }),
    [],
  );

  function send(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return;
    setInput("");
    setMessages((prev) => [...prev, { id: nextId++, role: "user", content: trimmed }]);
    setTyping(true);
    timeoutRef.current = setTimeout(() => {
      setTyping(false);
      setMessages((prev) => [
        ...prev,
        { id: nextId++, role: "bot", content: RESPONSES[trimmed] ?? DEFAULT_RESPONSE },
      ]);
    }, 900);
  }

  return (
    <div className="dw-main">
      <div style={{ fontSize: 12, color: "#aaa", marginBottom: 8 }}>Inicio › IA ✦</div>
      <div style={{ marginBottom: 12 }}>
        <div className="dw-ph-t">Asistente WeHunter</div>
        <div className="dw-ph-s">Pedile lo que necesités en lenguaje natural.</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", height: 320 }}>
        <div
          ref={scrollRef}
          style={{
            flex: 1,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 10,
            marginBottom: 10,
          }}
        >
          {messages.map((m) => (
            <div key={m.id}>
              <div className={`as-msg ${m.role}`}>
                <div className="as-lbl">{m.role === "user" ? "Vos" : "Asistente"}</div>
                <div className="as-bubble">{m.content}</div>
              </div>
              {m.id === 0 && (
                <div style={{ alignSelf: "flex-start" }}>
                  <div className="dw-lbl" style={{ marginBottom: 6 }}>Probá con:</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {SUGGESTIONS.map((s) => (
                      <div key={s} className="as-chip" onClick={() => send(s)}>
                        {s}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
          {typing && (
            <div className="as-msg bot">
              <div className="as-lbl">Asistente</div>
              <div className="as-bubble">
                <span className="dw-typing-sm">
                  <span />
                  <span />
                  <span />
                </span>
              </div>
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            className="dw-input"
            placeholder="Escribí tu pedido..."
            style={{ flex: 1 }}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") send(input);
            }}
          />
          <button className="dw-btn" onClick={() => send(input)}>
            Enviar ✦
          </button>
        </div>
      </div>
    </div>
  );
});
