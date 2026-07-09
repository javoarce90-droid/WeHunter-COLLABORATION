import { Reveal } from "./Reveal";

const CHANGES = [
  "Menos tiempo filtrando CVs.",
  "Más candidatos alineados con la vacante.",
  "Feedback más ágil por parte del cliente.",
  "Procesos de selección más ordenados y eficientes.",
  "Más tiempo para cerrar búsquedas y generar valor.",
];

export function WhatChanges() {
  return (
    <section className="alt">
      <div className="sec" style={{ textAlign: "center" }}>
        <Reveal>
          <div className="eyebrow" style={{ justifyContent: "center", display: "flex" }}>
            Beneficios
          </div>
          <div className="sec-title">
            Lo que cambia desde
            <br />
            <em>el primer día.</em>
          </div>
        </Reveal>
        <Reveal className="changes-grid">
          {CHANGES.map((text) => (
            <div className="change-item" key={text}>
              <div className="change-check">✓</div>
              <div className="change-txt">{text}</div>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
