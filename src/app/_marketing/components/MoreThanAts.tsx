import { Reveal } from "./Reveal";

const MODULES = [
  { icon: "📋", name: "ATS" },
  { icon: "🤝", name: "CRM" },
  { icon: "✨", name: "IA" },
  { icon: "💬", name: "Comunicación" },
  { icon: "⭐", name: "Feedback" },
  { icon: "📅", name: "Entrevistas" },
  { icon: "📊", name: "Reportes" },
  { icon: "⚡", name: "Automatizaciones" },
  { icon: "👥", name: "Base de Candidatos" },
  { icon: "🌐", name: "Career Site" },
  { icon: "💼", name: "Portal de Empleos" },
  { icon: "🔍", name: "Sourcing" },
  { icon: "🏘️", name: "Comunidad" },
];

export function MoreThanAts() {
  return (
    <section>
      <div id="mucho-mas-ats" className="sec" style={{ textAlign: "center" }}>
        <Reveal>
          <div className="sec-title">Mucho más que un ATS.</div>
          <div className="sec-sub" style={{ margin: "14px auto 0" }}>
            Mientras otros sistemas solo administran candidatos, WeHunter reúne
            todas las herramientas necesarias para gestionar el proceso completo
            de contratación desde una única plataforma.
          </div>
        </Reveal>
        <Reveal className="module-grid">
          {MODULES.map((m) => (
            <div className="module-chip" key={m.name}>
              <div className="module-chip-icon">{m.icon}</div>
              <div className="module-chip-name">{m.name}</div>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
