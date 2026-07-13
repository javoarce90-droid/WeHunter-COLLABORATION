"use client";

const CANDIDATES = [
  { initials: "IL", name: "Irene Luna", role: "PM freelance", tags: ["Producto", "Agile", "Discovery"], origin: "Origen: Demo flujo" },
  { initials: "HS", name: "Hugo Silva", role: "Head of Product", tags: ["Producto", "Agile"], origin: "Origen: Demo flujo" },
  { initials: "VS", name: "Valentina Sosa", role: "QA Engineer", tags: ["Playwright", "Jest"], origin: "Origen: Referido" },
  { initials: "SR", name: "Sofía Ruiz", role: "Analista Jr", tags: ["SQL", "Python"], origin: "Origen: Demo seed" },
];

export function TalentoPanel({ onOpenCandidato }: { onOpenCandidato: () => void }) {
  return (
    <div className="dw-main">
      <div style={{ fontSize: 12, color: "#aaa", marginBottom: 4 }}>Inicio › Talento</div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <div>
          <div className="dw-ph-t">Talento</div>
          <div className="dw-ph-s">16 candidatos en el pool</div>
        </div>
        <button className="dw-btn" onClick={onOpenCandidato}>
          + Agregar candidato
        </button>
      </div>
      <input
        className="dw-input"
        placeholder="Buscar por nombre, email, título o skill..."
        style={{ marginBottom: 12 }}
        readOnly
      />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
        {CANDIDATES.map((c) => (
          <div
            key={c.name}
            className="dw-card"
            style={{ cursor: "pointer" }}
            onClick={onOpenCandidato}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div className="dw-av" style={{ background: "#ede9fe", color: "#6d28d9" }}>
                {c.initials}
              </div>
              <div>
                <div className="dw-kn">{c.name}</div>
                <div className="dw-ks">{c.role}</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 6 }}>
              {c.tags.map((tag) => (
                <span key={tag} className="sol-tag" style={{ fontSize: 10, padding: "2px 7px" }}>
                  {tag}
                </span>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 10.5, color: "#aaa" }}>{c.origin}</span>
              <span style={{ fontSize: 10.5, color: "#6d28d9", fontWeight: 600 }}>Ver ficha →</span>
            </div>
          </div>
        ))}
      </div>
      <div style={{ textAlign: "center", marginTop: 9, fontSize: 11, color: "#aaa" }}>
        Mostrando 4 de 16 candidatos
      </div>
    </div>
  );
}
