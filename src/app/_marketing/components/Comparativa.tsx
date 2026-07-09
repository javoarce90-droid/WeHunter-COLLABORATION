import { Reveal } from "./Reveal";

const BEFORE_TOOLS = ["ATS", "Excel", "WhatsApp", "Email", "Calendario", "Drive", "Notas"];
const AFTER_CHIPS = ["Búsquedas", "Talento", "Clientes", "Entrevistas", "Feedbacks", "IA ✦", "Reportes"];

export function Comparativa() {
  return (
    <section>
      <div className="sec">
        <Reveal style={{ textAlign: "center", marginBottom: 48 }}>
          <div className="eyebrow" style={{ justifyContent: "center", display: "flex" }}>
            Comparativa
          </div>
          <div className="sec-title">
            Menos herramientas.
            <br />
            <em>Más control.</em>
          </div>
          <div className="sec-sub" style={{ margin: "14px auto 0" }}>
            Hoy muchos recruiters trabajan con múltiples herramientas separadas. WeHunter
            centraliza toda esa operación en una única plataforma.
          </div>
        </Reveal>
        <Reveal className="comp-grid">
          <div className="comp-col before">
            <div className="comp-label">ASÍ TRABAJAN HOY MUCHOS EQUIPOS</div>
            <div className="comp-boxes">
              {BEFORE_TOOLS.map((tool) => (
                <span className="comp-box" key={tool}>
                  {tool}
                </span>
              ))}
            </div>
            <div className="comp-text">
              La información vive en distintos lugares. El seguimiento depende de procesos
              manuales y cada búsqueda requiere saltar entre múltiples herramientas.
            </div>
          </div>
          <div className="comp-col after">
            <div className="comp-label">ASÍ FUNCIONA WEHUNTER</div>
            <div className="comp-center">
              <div className="comp-center-title">
                We<span>Hunter.</span>
              </div>
              <div className="comp-inner">
                {AFTER_CHIPS.map((chip) => (
                  <span className="comp-chip" key={chip}>
                    {chip}
                  </span>
                ))}
              </div>
            </div>
            <div className="comp-text">
              Centralizá toda tu operación de recruiting en un único lugar y obtené
              visibilidad completa sobre cada proceso.
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
