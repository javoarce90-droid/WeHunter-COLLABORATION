import { Reveal } from "./Reveal";

const AUDIENCES = [
  {
    emoji: "👤",
    title: "Recruiters Independientes",
    desc: "Organizá tu operación, gestioná múltiples búsquedas y fortalecé la experiencia que ofrecés a clientes y candidatos.",
  },
  {
    emoji: "🏢",
    title: "Equipos de Talent Acquisition",
    desc: "Centralizá procesos, facilitá la colaboración con hiring managers y tomá decisiones con mayor visibilidad y trazabilidad.",
  },
  {
    emoji: "🚀",
    title: "Consultoras y Agencias",
    desc: "Gestioná clientes, búsquedas y equipos desde un único lugar para diferenciar tu servicio y escalar tu operación.",
  },
];

export function Audience() {
  return (
    <section className="alt">
      <div className="sec">
        <Reveal style={{ textAlign: "center" }}>
          <div className="sec-title">
            Diseñado para quienes
            <br />
            <em>contratan talento.</em>
          </div>
        </Reveal>
        <Reveal className="aud-grid">
          {AUDIENCES.map((a) => (
            <div className="aud-card card-l" key={a.title}>
              <div className="aud-emoji">{a.emoji}</div>
              <div className="aud-t">{a.title}</div>
              <div className="aud-d">{a.desc}</div>
            </div>
          ))}
        </Reveal>
        <Reveal style={{ textAlign: "center", marginTop: 36 }}>
          <a className="btn-pill" href="#contact-form-anchor">
            Solicitar Demo
          </a>
        </Reveal>
      </div>
    </section>
  );
}
