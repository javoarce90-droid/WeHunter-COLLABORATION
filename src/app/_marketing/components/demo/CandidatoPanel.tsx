"use client";

export function CandidatoPanel({ onBack }: { onBack: () => void }) {
  return (
    <div className="dw-main">
      <div style={{ fontSize: 12, color: "#aaa", marginBottom: 4 }}>
        Inicio › Talento › <strong style={{ color: "#374151" }}>Irene Luna</strong>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <div className="dw-av-lg">IL</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#111" }}>Irene Luna</div>
          <div style={{ fontSize: 12, color: "#6b7280" }}>PM freelance · Buenos Aires</div>
          <div style={{ marginTop: 5, display: "flex", gap: 5, flexWrap: "wrap" }}>
            <span className="sol-tag" style={{ fontSize: 10, padding: "2px 7px" }}>Producto</span>
            <span className="sol-tag" style={{ fontSize: 10, padding: "2px 7px" }}>Agile</span>
            <span className="sol-tag" style={{ fontSize: 10, padding: "2px 7px" }}>Discovery</span>
          </div>
        </div>
        <button className="dw-btn-o" style={{ fontSize: 11, padding: "6px 12px" }} onClick={onBack}>
          ← Volver
        </button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
        <div className="dw-card">
          <div className="dw-card-t">Datos de contacto</div>
          <div style={{ fontSize: 12, color: "#6b7280", lineHeight: 2 }}>
            📧 irene.luna@email.com
            <br />
            📱 +54 11 3456-7890
            <br />
            💰 ARS 380.000
            <br />
            📅 Disponibilidad: inmediata
          </div>
        </div>
        <div className="dw-card">
          <div className="dw-card-t">Perfil WeHunt</div>
          <div
            style={{
              fontSize: 12,
              color: "#374151",
              background: "#ede9fe",
              borderRadius: 8,
              padding: 9,
              lineHeight: 1.6,
            }}
          >
            Alta Llegada y Foco · Perfil colaborativo con orientación a resultados. Ideal
            para equipos con claridad de objetivos.
          </div>
        </div>
      </div>
    </div>
  );
}
