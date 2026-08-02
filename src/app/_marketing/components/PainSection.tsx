import { Reveal } from "./Reveal";

const TOOLS = [
  "📊 Excel",
  "💬 WhatsApp",
  "📧 Email",
  "🔗 LinkedIn",
  "📅 Calendario",
  "📁 Drive",
  "📝 Notas",
];

export function PainSection() {
  return (
    <section>
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
    </section>
  );
}
