"use client";

import { useState } from "react";

const DAYS = [
  { label: "LUN", n: 15, active: true },
  { label: "MAR", n: 16, active: false },
  { label: "MIÉ", n: 17, active: false },
  { label: "JUE", n: 18, active: false },
  { label: "VIE", n: 19, active: false },
];

export function EntrevistasPanel() {
  const [agendado, setAgendado] = useState(false);

  return (
    <div className="dw-main">
      <div style={{ fontSize: 12, color: "#aaa", marginBottom: 8 }}>Inicio › Entrevistas</div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <div>
          <div className="dw-ph-t">Entrevistas</div>
          <div className="dw-ph-s">Vista semanal · planificación y operación diaria</div>
        </div>
        <button className="dw-btn" onClick={() => setAgendado(true)}>
          📅 Agendar entrevista
        </button>
      </div>
      {agendado && (
        <div
          style={{
            background: "#faf5ff",
            border: "1.5px solid #6d28d9",
            borderRadius: 10,
            padding: "12px 14px",
            marginBottom: 12,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, color: "#6d28d9", marginBottom: 4 }}>
            ✓ Entrevista agendada
          </div>
          <div style={{ fontSize: 12, color: "#374151", marginBottom: 2 }}>
            <strong>Luciana G.</strong> — Dev Fullstack @ Acme Corp
          </div>
          <div style={{ fontSize: 11, color: "#6b7280" }}>
            Jueves 19 · 17:00 hs · Google Meet · Link enviado por email
          </div>
        </div>
      )}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5,1fr)",
          gap: 7,
          marginBottom: 14,
        }}
      >
        {DAYS.map((d) => (
          <div
            key={d.label}
            style={{
              border: d.active ? "1.5px solid #6d28d9" : "1px solid #e5e7eb",
              borderRadius: 9,
              padding: "8px 5px",
              textAlign: "center",
              background: d.active ? "#faf5ff" : undefined,
            }}
          >
            <div style={{ fontSize: 9, color: d.active ? "#6d28d9" : "#9ca3af", fontWeight: d.active ? 700 : 400 }}>
              {d.label}
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: d.active ? "#6d28d9" : "#374151" }}>
              {d.n}
            </div>
          </div>
        ))}
      </div>
      <div className="dw-card" style={{ marginBottom: 9 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 7 }}>
          <div style={{ width: 4, height: 36, background: "#6d28d9", borderRadius: 4, flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: "#111" }}>Entrevista — Luciana G.</div>
            <div style={{ fontSize: 11, color: "#6b7280" }}>
              10:00 hs · Dev Fullstack · Acme Corp · Google Meet
            </div>
          </div>
          <button className="dw-btn-o" style={{ marginLeft: "auto", fontSize: 11, padding: "5px 11px" }}>
            Unirse
          </button>
        </div>
      </div>
      <div className="dw-card">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 4, height: 36, background: "#a78bfa", borderRadius: 4, flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: "#111" }}>
              ♦ Informe generado con IA
            </div>
            <div style={{ fontSize: 11, color: "#6b7280" }}>
              Candidata con experiencia sólida · Gap: inglés · Recomendación: avanzar
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
