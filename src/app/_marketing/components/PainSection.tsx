import { Reveal } from "./Reveal";

const PAINS = [
  "Invertir horas filtrando CVs que no cumplen con el perfil.",
  "Esperar días para recibir feedback del cliente.",
  "Trabajar entre Excel, WhatsApp, LinkedIn y correo para gestionar una sola búsqueda.",
  "Dedicar más tiempo a tareas operativas que a evaluar talento.",
  "Sentir que tu trabajo se limita a enviar candidatos.",
];

const TOOLS = ["📊 Excel", "💬 WhatsApp", "📧 Email", "🔗 LinkedIn", "📅 Calendario", "📁 Drive", "📝 Notas"];

export function PainSection() {
  return (
    <section className="pain-section">
      <div className="sec" style={{ textAlign: "center" }}>
        <Reveal>
          <div className="eyebrow" style={{ justifyContent: "center", display: "flex" }}>
            El problema
          </div>
          <div className="sec-title">
            Reclutar no debería
            <br />
            <em>sentirse así.</em>
          </div>
        </Reveal>
        <Reveal className="pain-items">
          {PAINS.map((text) => (
            <div className="pain-item-v2" key={text}>
              <div className="pain-x">✕</div>
              <div className="pain-txt">{text}</div>
            </div>
          ))}
        </Reveal>
        <Reveal className="pain-punch-v2">
          <p>El problema no es que trabajes mucho.</p>
          <span>Es que trabajás con demasiadas herramientas separadas.</span>
        </Reveal>
        <Reveal className="tools-converge">
          {TOOLS.map((tool) => (
            <div className="tool-pill" key={tool}>
              {tool}
            </div>
          ))}
          <div className="tool-arrow">→</div>
          <div className="wh-center-pill">WeHunter. — Todo en uno</div>
        </Reveal>
      </div>
    </section>
  );
}
