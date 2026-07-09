"use client";

export function EquipoPanel() {
  return (
    <div className="dw-main">
      <div style={{ fontSize: 12, color: "#aaa", marginBottom: 4 }}>Inicio › Mi equipo</div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 18,
        }}
      >
        <div>
          <div className="dw-ph-t">Mi equipo</div>
          <div className="dw-ph-s">Gestioná los accesos de tu workspace.</div>
        </div>
        <button className="dw-btn">👥 Invitar miembro</button>
      </div>
      <div className="dw-card" style={{ padding: 0, overflow: "hidden" }}>
        <table className="dw-table" style={{ fontSize: 12 }}>
          <tbody>
            <tr>
              <th>Miembro</th>
              <th>Rol</th>
              <th>Puede hacer</th>
              <th>Asignado a</th>
              <th>Estado</th>
            </tr>
            <tr>
              <td>
                <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <div className="dw-av" style={{ background: "#6d28d9", color: "#fff", width: 28, height: 28, fontSize: 10 }}>
                    YA
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, color: "#111" }}>
                      yas@wehunter.com{" "}
                      <span style={{ color: "#aaa", fontWeight: 400 }}>(vos)</span>
                    </div>
                    <div style={{ fontSize: 10, color: "#aaa" }}>yas@wehunter.com</div>
                  </div>
                </div>
              </td>
              <td>
                <span style={{ fontWeight: 600 }}>Administrador</span>
              </td>
              <td>
                <span style={{ color: "#16a34a", fontSize: 11, fontWeight: 600 }}>✓ Todo el ATS</span>
              </td>
              <td style={{ color: "#aaa", fontSize: 11 }}>Todas las búsquedas</td>
              <td>
                <span className="dw-pill green">Activo</span>
              </td>
            </tr>
            <tr style={{ background: "#fafafa" }}>
              <td>
                <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <div className="dw-av" style={{ background: "#ede9fe", color: "#6d28d9", width: 28, height: 28, fontSize: 10 }}>
                    CO
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, color: "#111" }}>colega@wehunter.com</div>
                    <div style={{ fontSize: 10, color: "#aaa" }}>colega@wehunter.com</div>
                  </div>
                </div>
              </td>
              <td>
                <span style={{ fontWeight: 600 }}>Hiring Manager</span>
              </td>
              <td>
                <div style={{ fontSize: 11, lineHeight: 1.8 }}>
                  <div style={{ color: "#16a34a" }}>✓ Crear solicitudes</div>
                  <div style={{ color: "#16a34a" }}>✓ Ver búsquedas asignadas</div>
                  <div style={{ color: "#16a34a" }}>✓ Aprobar candidatos</div>
                  <div style={{ color: "#aaa", textDecoration: "line-through" }}>
                    Crear búsquedas en ATS
                  </div>
                </div>
              </td>
              <td>
                <div style={{ fontSize: 11, color: "#111" }}>Diseñadora UXUI Sr</div>
                <div style={{ fontSize: 11, color: "#6d28d9", cursor: "pointer" }}>
                  Gestionar asignaciones
                </div>
              </td>
              <td>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <span className="dw-pill green">Activo</span>
                  <span style={{ fontSize: 11, color: "#aaa", cursor: "pointer", textDecoration: "underline" }}>
                    Desactivar
                  </span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div
        style={{
          marginTop: 12,
          background: "#f8f7fd",
          borderRadius: 9,
          padding: "10px 14px",
          fontSize: 12,
          color: "#888",
          cursor: "pointer",
        }}
      >
        ▶ REFERENCIA DE ROLES
      </div>
    </div>
  );
}
