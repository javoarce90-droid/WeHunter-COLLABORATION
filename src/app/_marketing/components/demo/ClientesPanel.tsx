"use client";

export function ClientesPanel() {
  return (
    <div className="dw-main">
      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>Inicio › Clientes</div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <div>
          <div className="dw-ph-t">Clientes</div>
          <div className="dw-ph-s">Gestioná tu cartera de clientes.</div>
        </div>
        <button className="dw-btn">+ Nuevo cliente</button>
      </div>
      <div className="dw-card" style={{ cursor: "pointer", marginBottom: 10 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 9,
                background: "#ede9fe",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 13,
                fontWeight: 800,
                color: "#6d28d9",
              }}
            >
              AC
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#111" }}>Acme Corp</div>
              <div style={{ fontSize: 11, color: "#6b7280" }}>Tecnología · Buenos Aires</div>
            </div>
          </div>
          <span className="dw-pill green">Activo</span>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3,1fr)",
            gap: 8,
            marginBottom: 10,
          }}
        >
          <div style={{ textAlign: "center", background: "#f9fafb", borderRadius: 8, padding: 8 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#6d28d9" }}>2</div>
            <div style={{ fontSize: 10, color: "#6b7280" }}>Abiertas</div>
          </div>
          <div style={{ textAlign: "center", background: "#f9fafb", borderRadius: 8, padding: 8 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#111" }}>0</div>
            <div style={{ fontSize: 10, color: "#6b7280" }}>En pausa</div>
          </div>
          <div style={{ textAlign: "center", background: "#f9fafb", borderRadius: 8, padding: 8 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#111" }}>5</div>
            <div style={{ fontSize: 10, color: "#6b7280" }}>Cerradas</div>
          </div>
        </div>
        <div style={{ background: "#f0fdf4", borderRadius: 8, padding: "9px 12px", fontSize: 12 }}>
          <span style={{ fontWeight: 700, color: "#15803d" }}>Feedback recibido ✓</span>{" "}
          <span style={{ color: "#374151" }}>
            &quot;Quisiéramos coordinar una entrevista con Luciana.&quot; — hace 4 hs
          </span>
        </div>
      </div>
      <div className="dw-card" style={{ cursor: "pointer" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 9,
                background: "#fef3c7",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 13,
                fontWeight: 800,
                color: "#92400e",
              }}
            >
              GX
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#111" }}>Globex SA</div>
              <div style={{ fontSize: 11, color: "#6b7280" }}>Servicios · Córdoba</div>
            </div>
          </div>
          <span className="dw-pill green">Activo</span>
        </div>
      </div>
    </div>
  );
}
