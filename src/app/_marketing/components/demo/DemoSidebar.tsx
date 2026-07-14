"use client";

import type { DemoTabId } from "../DemoTabContext";
import { WehunterLogo } from "@/components/ui/wehunter-logo";

const NAV_ITEMS: { id: DemoTabId; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "busqueda", label: "Búsquedas" },
  { id: "talento", label: "Talento" },
  { id: "clientes", label: "Clientes" },
  { id: "equipo", label: "Mi equipo" },
  { id: "entrevistas", label: "Entrevistas" },
  { id: "solicitudes", label: "Solicitudes" },
  { id: "notificaciones", label: "Notificaciones" },
];

export function DemoSidebar({
  active,
  onNavigate,
}: {
  active: DemoTabId;
  onNavigate: (id: DemoTabId) => void;
}) {
  return (
    <div className="dw-side">
      <div className="dw-logo-area">
        <WehunterLogo variant="white" height={15} />
        <div className="dw-ats-lbl">ATS Recruiter</div>
      </div>
      {NAV_ITEMS.map((item) => (
        <div
          key={item.id}
          className={`dw-side-item${active === item.id ? " active" : ""}`}
          onClick={() => onNavigate(item.id)}
        >
          {item.label}
        </div>
      ))}
      <div className="dw-side-sep">PRÓXIMAMENTE</div>
      <div className="dw-side-item dw-preview">
        Hunters <span className="dw-prev-badge">PREVIEW</span>
      </div>
      <div className="dw-side-item dw-preview">
        Sourcing <span className="dw-prev-badge">PREVIEW</span>
      </div>
      <div className="dw-side-item dw-preview">
        Reportes <span className="dw-prev-badge">PREVIEW</span>
      </div>
      <div className="dw-side-user">
        <div className="dw-av" style={{ background: "#6d28d9", color: "#fff" }}>
          S
        </div>
        <div>
          <div className="dw-uname">Sofi</div>
          <div className="dw-urole">Admin · starter</div>
        </div>
      </div>
    </div>
  );
}
