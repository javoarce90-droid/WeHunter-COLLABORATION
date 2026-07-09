"use client";

import { useState } from "react";

export function BusquedaPanel() {
  const [showFicha, setShowFicha] = useState(false);

  return (
    <div className="dw-main">
      <div style={{ fontSize: 12, color: "#aaa", marginBottom: 4 }}>
        Inicio › Búsquedas ›{" "}
        <strong style={{ color: "#374151" }}>Dev Fullstack — Acme Corp</strong>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <div>
          <div className="dw-ph-t">Dev Fullstack</div>
          <div className="dw-ph-s">Acme Corp · 12 candidatos · 18 días activa</div>
        </div>
        <div style={{ display: "flex", gap: 7 }}>
          <button className="dw-btn">+ Agregar candidato</button>
          <button className="dw-btn-o" style={{ fontSize: 11, padding: "6px 12px" }}>
            Compartir con cliente
          </button>
        </div>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          gap: 8,
          position: "relative",
        }}
      >
        {showFicha && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "#fff",
              zIndex: 10,
              padding: 16,
              borderRadius: 10,
              border: "1.5px solid #6d28d9",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 12,
                cursor: "pointer",
                color: "#6d28d9",
                fontSize: 12,
                fontWeight: 600,
              }}
              onClick={() => setShowFicha(false)}
            >
              ← Volver al tablero
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 14 }}>
              <div className="dw-av" style={{ width: 42, height: 42, fontSize: 14 }}>
                ST
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#111" }}>
                  Suri Tettenborn
                </div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>
                  Lic. RRHH · 6 años · Buenos Aires
                </div>
              </div>
              <select
                style={{
                  marginLeft: "auto",
                  border: "1px solid #e5e7eb",
                  borderRadius: 20,
                  padding: "4px 10px",
                  fontSize: 11,
                  color: "#6d28d9",
                  fontWeight: 600,
                  background: "#faf5ff",
                  fontFamily: "var(--font-manrope)",
                }}
              >
                <option>Contactado</option>
                <option>Entrevistado</option>
                <option>Finalista</option>
              </select>
            </div>
            <div
              style={{
                background: "#ede9fe",
                borderRadius: 9,
                padding: "11px 13px",
                marginBottom: 10,
                borderLeft: "3px solid #6d28d9",
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, color: "#3C3489", marginBottom: 4 }}>
                WeHunt · 81% match
              </div>
              <div style={{ fontSize: 12, color: "#374151", lineHeight: 1.55 }}>
                Alta Llegada y Cintura — ideal para entornos dinámicos.{" "}
                <strong>Recomendación: avanzar a entrevista.</strong>
              </div>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
                fontSize: 12,
              }}
            >
              <div style={{ color: "#6b7280" }}>📧 suri.tettenborn@mail.com</div>
              <div style={{ color: "#6b7280" }}>📱 +54 11 4567-8901</div>
              <div style={{ color: "#6b7280" }}>💰 ARS 450.000</div>
              <div style={{ color: "#6b7280" }}>📅 Disponibilidad inmediata</div>
            </div>
          </div>
        )}
        <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 10, padding: 10 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "#111",
              marginBottom: 8,
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            Sourcing
            <span style={{ background: "#ede9fe", color: "#6d28d9", borderRadius: 100, padding: "0 6px", fontSize: 10 }}>
              4
            </span>
          </div>
          <div className="dw-kcard">
            <div className="dw-kn">Ana Torres</div>
            <div className="dw-ks">Backend · 88%</div>
          </div>
          <div className="dw-kcard">
            <div className="dw-kn">Felipe C.</div>
            <div className="dw-ks">Python · 72%</div>
          </div>
        </div>
        <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 10, padding: 10 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "#111",
              marginBottom: 8,
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            Contactados
            <span style={{ background: "#ede9fe", color: "#6d28d9", borderRadius: 100, padding: "0 6px", fontSize: 10 }}>
              4
            </span>
          </div>
          <div className="dw-kcard hot" style={{ cursor: "pointer" }} onClick={() => setShowFicha(true)}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span className="dw-kn">Suri T.</span>
              <span
                style={{
                  background: "#EAF3DE",
                  color: "#27500A",
                  borderRadius: 4,
                  padding: "1px 5px",
                  fontSize: 9,
                  fontWeight: 700,
                }}
              >
                WeHunt
              </span>
            </div>
            <div className="dw-ks">RRHH · 81% · hace 8d</div>
          </div>
          <div className="dw-kcard">
            <div className="dw-kn">Carlos F.</div>
            <div className="dw-ks">Ventas · 65%</div>
          </div>
        </div>
        <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 10, padding: 10 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "#111",
              marginBottom: 8,
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            Entrevista
            <span style={{ background: "#ede9fe", color: "#6d28d9", borderRadius: 100, padding: "0 6px", fontSize: 10 }}>
              2
            </span>
          </div>
          <div className="dw-kcard">
            <div className="dw-kn">Martín R.</div>
            <div className="dw-ks">Económicas · 78%</div>
          </div>
        </div>
        <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 10, padding: 10 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "#111",
              marginBottom: 8,
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            Finalistas
            <span style={{ background: "#ede9fe", color: "#6d28d9", borderRadius: 100, padding: "0 6px", fontSize: 10 }}>
              2
            </span>
          </div>
          <div className="dw-kcard" style={{ borderColor: "#6d28d9", background: "#faf5ff" }}>
            <div className="dw-kn">Luciana G.</div>
            <div className="dw-ks">Admin · 91% ⭐</div>
          </div>
        </div>
      </div>
    </div>
  );
}
