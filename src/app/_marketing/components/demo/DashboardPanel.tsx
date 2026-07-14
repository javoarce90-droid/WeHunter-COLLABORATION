"use client";

import type { DemoTabId } from "../DemoTabContext";

export function DashboardPanel({
  onNavigate,
}: {
  onNavigate: (id: DemoTabId) => void;
}) {
  return (
    <div className="dw-main">
      <div style={{ fontSize: 12, color: "#aaa", marginBottom: 2 }}>Inicio</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: "#111", marginBottom: 14 }}>
        Buenas tardes, Sofi 👋
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          gap: 9,
          marginBottom: 14,
        }}
      >
        <div className="dw-stat">
          <div className="dw-stat-l">Búsquedas activas</div>
          <div className="dw-stat-n">12</div>
        </div>
        <div className="dw-stat">
          <div className="dw-stat-l">Candidatos</div>
          <div className="dw-stat-n">87</div>
        </div>
        <div className="dw-stat">
          <div className="dw-stat-l">Entrevistas hoy</div>
          <div className="dw-stat-n">6</div>
        </div>
        <div className="dw-stat">
          <div className="dw-stat-l">Cierres del mes</div>
          <div className="dw-stat-n">3</div>
        </div>
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: "#111", marginBottom: 9 }}>
        Búsquedas en curso
      </div>
      <div className="dw-card" style={{ padding: 0, overflow: "hidden", marginBottom: 10 }}>
        <table className="dw-table" style={{ fontSize: 12 }}>
          <tbody>
            <tr>
              <th>Búsqueda</th>
              <th>Cliente</th>
              <th>Etapa</th>
              <th>Días</th>
              <th>Estado</th>
            </tr>
            <tr style={{ cursor: "pointer" }} onClick={() => onNavigate("busqueda")}>
              <td>
                <div style={{ fontWeight: 600, color: "#111" }}>Dev Fullstack</div>
              </td>
              <td style={{ color: "#6b7280" }}>Acme Corp</td>
              <td style={{ color: "#6b7280" }}>Entrevista</td>
              <td style={{ color: "#6b7280" }}>18</td>
              <td>
                <span className="dw-pill green">Activa</span>
              </td>
            </tr>
            <tr style={{ cursor: "pointer" }} onClick={() => onNavigate("busqueda")}>
              <td>
                <div style={{ fontWeight: 600, color: "#111" }}>Diseñadora UXUI Sr</div>
              </td>
              <td style={{ color: "#6b7280" }}>Globex SA</td>
              <td style={{ color: "#6b7280" }}>Sourcing</td>
              <td style={{ color: "#6b7280" }}>5</td>
              <td>
                <span className="dw-pill green">Activa</span>
              </td>
            </tr>
            <tr style={{ cursor: "pointer" }} onClick={() => onNavigate("busqueda")}>
              <td>
                <div style={{ fontWeight: 600, color: "#111" }}>Product Manager</div>
              </td>
              <td style={{ color: "#6b7280" }}>Acme Corp</td>
              <td style={{ color: "#6b7280" }}>Finalistas</td>
              <td style={{ color: "#6b7280" }}>32</td>
              <td>
                <span className="dw-pill" style={{ background: "#fef3c7", color: "#92400e" }}>
                  Por cerrar
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <button className="dw-btn" onClick={() => onNavigate("busqueda")}>
        + Nueva búsqueda
      </button>
    </div>
  );
}
