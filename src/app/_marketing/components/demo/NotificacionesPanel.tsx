"use client";

import { useState } from "react";

export function NotificacionesPanel() {
  const [read, setRead] = useState(false);

  return (
    <div className="dw-main">
      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Inicio › Notificaciones</div>
      <div style={{ marginBottom: 16 }}>
        <div className="dw-ph-t">Notificaciones</div>
        <div className="dw-ph-s">Actividad reciente de tu workspace.</div>
      </div>
      <div className="dw-card" style={{ padding: 0, overflow: "hidden" }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
            padding: "12px 16px",
            borderBottom: "1px solid #f3f4f6",
            opacity: read ? 0.55 : 1,
            transition: "opacity 0.5s",
            cursor: "pointer",
          }}
          onClick={() => setRead(true)}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: read ? "#e5e7eb" : "#6d28d9",
              flexShrink: 0,
              marginTop: 4,
              transition: "background 0.5s",
            }}
          />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#111" }}>Entrevista mañana</div>
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
              Lucas Méndez · Dev Fullstack @ Acme Corp · 10:00 hs
            </div>
          </div>
          <div style={{ fontSize: 11, color: "#9ca3af", whiteSpace: "nowrap" }}>Hace 1h</div>
        </div>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 16px", borderBottom: "1px solid #f3f4f6" }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#6d28d9", flexShrink: 0, marginTop: 4 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#111" }}>CV parseado con IA ✦</div>
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
              María López · 94% match para Dev Fullstack
            </div>
          </div>
          <div style={{ fontSize: 11, color: "#9ca3af", whiteSpace: "nowrap" }}>Hace 3h</div>
        </div>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 16px", borderBottom: "1px solid #f3f4f6" }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#e5e7eb", flexShrink: 0, marginTop: 4 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: "#374151" }}>Feedback del cliente recibido</div>
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
              Acme Corp aprobó a Luciana G. para avanzar a oferta
            </div>
          </div>
          <div style={{ fontSize: 11, color: "#9ca3af", whiteSpace: "nowrap" }}>Ayer</div>
        </div>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 16px" }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#e5e7eb", flexShrink: 0, marginTop: 4 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: "#374151" }}>Nueva solicitud del equipo</div>
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
              colega@wehunter.com solicitó Diseñadora UXUI Sr
            </div>
          </div>
          <div style={{ fontSize: 11, color: "#9ca3af", whiteSpace: "nowrap" }}>Hace 2d</div>
        </div>
      </div>
    </div>
  );
}
