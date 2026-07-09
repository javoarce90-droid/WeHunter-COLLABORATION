"use client";

import { useState } from "react";

export function SolicitudesPanel() {
  const [approved, setApproved] = useState(false);

  return (
    <div className="dw-main">
      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Inicio › Solicitudes</div>
      <div style={{ marginBottom: 18 }}>
        <div className="dw-ph-t">Solicitudes</div>
        <div className="dw-ph-s">Pedidos de búsqueda de tu equipo.</div>
      </div>
      <div className="dw-card" style={{ padding: 0, overflow: "hidden" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "13px 16px",
            borderBottom: "1px solid #f3f4f6",
          }}
        >
          <div className="dw-av" style={{ background: "#ede9fe", color: "#6d28d9", width: 32, height: 32, fontSize: 11 }}>
            CO
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#111" }}>
              Nueva búsqueda — Diseñadora UXUI Sr
            </div>
            <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
              colega@wehunter.com · hace 2 días
            </div>
          </div>
          <span
            style={{
              background: approved ? "#dcfce7" : "#fef3c7",
              color: approved ? "#15803d" : "#92400e",
              borderRadius: 6,
              padding: "3px 10px",
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            {approved ? "Aprobada" : "Pendiente"}
          </span>
          {!approved && (
            <button
              className="dw-btn"
              style={{ fontSize: 11, padding: "5px 11px" }}
              onClick={() => setApproved(true)}
            >
              Aprobar
            </button>
          )}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "13px 16px",
            borderBottom: "1px solid #f3f4f6",
          }}
        >
          <div className="dw-av" style={{ background: "#ede9fe", color: "#6d28d9", width: 32, height: 32, fontSize: 11 }}>
            CO
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#111" }}>
              Revisión de candidatos — Dev Fullstack
            </div>
            <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
              colega@wehunter.com · hace 5 días
            </div>
          </div>
          <span style={{ background: "#dcfce7", color: "#15803d", borderRadius: 6, padding: "3px 10px", fontSize: 11, fontWeight: 600 }}>
            Aprobada
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "13px 16px" }}>
          <div className="dw-av" style={{ background: "#ede9fe", color: "#6d28d9", width: 32, height: 32, fontSize: 11 }}>
            CO
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#111" }}>
              Aprobación candidato — Luciana G.
            </div>
            <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
              colega@wehunter.com · hace 1 semana
            </div>
          </div>
          <span style={{ background: "#dcfce7", color: "#15803d", borderRadius: 6, padding: "3px 10px", fontSize: 11, fontWeight: 600 }}>
            Aprobada
          </span>
        </div>
      </div>
    </div>
  );
}
