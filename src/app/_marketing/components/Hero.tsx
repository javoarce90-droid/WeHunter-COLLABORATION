import { Reveal } from "./Reveal";
import { InteractiveDemo } from "./demo/InteractiveDemo";

const BENEFITS = [
  { icon: "⚡", text: "Reducí tiempos de contratación" },
  { icon: "🧠", text: "IA integrada en todo el proceso" },
  { icon: "🤖", text: "Automatizaciones inteligentes" },
  { icon: "👥", text: "Diseñado para recruiters y consultoras" },
];

export function Hero() {
  return (
    <div className="hero-vh">
      <section className="hero">
        <div className="hero-os-label">
          El sistema operativo para recruiters.
        </div>
        <h1>
          Todo el proceso de contratación,
          <br />
          en <em>un solo lugar.</em>
        </h1>
        <p className="hero-sub">
          Desde que abrís una búsqueda hasta que contratás, WeHunter organiza,
          automatiza y acelera cada etapa del proceso.
        </p>

        <Reveal className="benefit-cards">
          {BENEFITS.map((b) => (
            <div className="benefit-card" key={b.text}>
              <div className="benefit-icon">{b.icon}</div>
              <div className="benefit-text">{b.text}</div>
            </div>
          ))}
        </Reveal>

        <Reveal className="modules-strip">
          <span>Un solo sistema para todo tu proceso.</span>
          ATS <span>•</span> CRM <span>•</span> IA <span>•</span> Base de
          Candidatos <span>•</span> Career Site <span>•</span> Portal de Empleos{" "}
          <span>•</span> Automatizaciones
        </Reveal>
        <div className="demo-stage" id="demo">
          <div className="demo-hint">
            Probala ahora — así se ve la plataforma real
          </div>
          <div className="demo-frost demo-wrapper" id="demo-auto-wrap">
            <div
              className="demo-cursor"
              id="demo-cursor"
              style={{ display: "none" }}
            ></div>
            <div className="demo-tooltip" id="demo-tooltip"></div>
            <div className="demo-tour-badge" id="demo-tour-badge">
              ● Tour en vivo
            </div>
            <div className="demo-window">
              <img alt="demo-ats" src="/demo/demo-ats.gif" width="100%" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
