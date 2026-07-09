"use client";

import { useDemoTab } from "../DemoTabContext";
import type { DemoTabId } from "../DemoTabContext";
import { DemoSidebar } from "./DemoSidebar";
import { DashboardPanel } from "./DashboardPanel";
import { BusquedaPanel } from "./BusquedaPanel";
import { TalentoPanel } from "./TalentoPanel";
import { ClientesPanel } from "./ClientesPanel";
import { EquipoPanel } from "./EquipoPanel";
import { CandidatoPanel } from "./CandidatoPanel";
import { EntrevistasPanel } from "./EntrevistasPanel";
import { SolicitudesPanel } from "./SolicitudesPanel";
import { NotificacionesPanel } from "./NotificacionesPanel";
import { AsistentePanel } from "./AsistentePanel";

const TABS: { id: DemoTabId; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "busqueda", label: "Búsquedas" },
  { id: "talento", label: "Talento" },
  { id: "clientes", label: "Clientes" },
  { id: "equipo", label: "Mi equipo" },
  { id: "entrevistas", label: "Entrevistas" },
  { id: "solicitudes", label: "Solicitudes" },
  { id: "notificaciones", label: "Notificaciones" },
  { id: "asistente", label: "IA ✦" },
];

export function InteractiveDemo() {
  const { activeTab, setActiveTab } = useDemoTab();

  return (
    <div className="demo-stage" id="demo">
      <div className="demo-hint">Probala ahora — así se ve la plataforma real</div>
      <div className="demo-frost demo-wrapper">
        <div className="demo-window">
          <div className="demo-titlebar">
            <span className="tl" style={{ background: "#ff5f57" }} />
            <span className="tl" style={{ background: "#febc2e" }} />
            <span className="tl" style={{ background: "#28c840" }} />
            <span className="demo-titlebar-label">WeHunter ATS — Demo interactiva</span>
          </div>
          <div className="demo-tabs">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                className={`demo-tab${activeTab === tab.id ? " active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className={`demo-panel${activeTab === "dashboard" ? " active" : ""}`}>
            <div className="dw">
              <DemoSidebar active={activeTab} onNavigate={setActiveTab} />
              <DashboardPanel onNavigate={setActiveTab} />
            </div>
          </div>
          <div className={`demo-panel${activeTab === "busqueda" ? " active" : ""}`}>
            <div className="dw">
              <DemoSidebar active={activeTab} onNavigate={setActiveTab} />
              <BusquedaPanel />
            </div>
          </div>
          <div className={`demo-panel${activeTab === "talento" ? " active" : ""}`}>
            <div className="dw">
              <DemoSidebar active={activeTab} onNavigate={setActiveTab} />
              <TalentoPanel onOpenCandidato={() => setActiveTab("candidato")} />
            </div>
          </div>
          <div className={`demo-panel${activeTab === "clientes" ? " active" : ""}`}>
            <div className="dw">
              <DemoSidebar active={activeTab} onNavigate={setActiveTab} />
              <ClientesPanel />
            </div>
          </div>
          <div className={`demo-panel${activeTab === "equipo" ? " active" : ""}`}>
            <div className="dw">
              <DemoSidebar active={activeTab} onNavigate={setActiveTab} />
              <EquipoPanel />
            </div>
          </div>
          <div className={`demo-panel${activeTab === "candidato" ? " active" : ""}`}>
            <div className="dw">
              <DemoSidebar active={activeTab} onNavigate={setActiveTab} />
              <CandidatoPanel onBack={() => setActiveTab("talento")} />
            </div>
          </div>
          <div className={`demo-panel${activeTab === "entrevistas" ? " active" : ""}`}>
            <div className="dw">
              <DemoSidebar active={activeTab} onNavigate={setActiveTab} />
              <EntrevistasPanel />
            </div>
          </div>
          <div className={`demo-panel${activeTab === "solicitudes" ? " active" : ""}`}>
            <div className="dw">
              <DemoSidebar active={activeTab} onNavigate={setActiveTab} />
              <SolicitudesPanel />
            </div>
          </div>
          <div className={`demo-panel${activeTab === "notificaciones" ? " active" : ""}`}>
            <div className="dw">
              <DemoSidebar active={activeTab} onNavigate={setActiveTab} />
              <NotificacionesPanel />
            </div>
          </div>
          <div className={`demo-panel${activeTab === "asistente" ? " active" : ""}`}>
            <div className="dw">
              <DemoSidebar active={activeTab} onNavigate={setActiveTab} />
              <AsistentePanel />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
