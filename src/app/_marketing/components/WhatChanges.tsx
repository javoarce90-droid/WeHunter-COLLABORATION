import { Reveal } from "./Reveal";

const PAINS = [
  "Invertir horas filtrando CVs que no cumplen con el perfil.",
  "Esperar días para recibir feedback del cliente.",
  "Gestionar una sola búsqueda entre Excel, LinkedIn y correo.",
  "Dedicar más tiempo a tareas operativas que a evaluar talento.",
  "Sentir que tu trabajo se limita a enviar candidatos.",
];

const CHANGES = [
  "Menos tiempo filtrando CVs.",
  "Más candidatos alineados con la vacante.",
  "Feedback más ágil por parte del cliente.",
  "Procesos de selección más ordenados y eficientes.",
  "Más tiempo para cerrar búsquedas y generar valor.",
];

export function WhatChanges() {
  return (
    <section className="seccion-comparativa">
      {/* Columna Izquierda: Pains */}
      <section className="comparativa-flex">
        <div className="columna-flex" style={{ textAlign: "center" }}>
          <Reveal>
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
        </div>
      </section>

      {/* Columna Derecha: Changes */}
      <section className="comparativa-flex">
        <div className="columna-flex" style={{ textAlign: "center" }}>
          <Reveal>
            <div className="sec-title">
              Lo que cambia desde
              <br />
              <em>el primer día.</em>
            </div>
          </Reveal>
          <Reveal className="pain-items">
            {CHANGES.map((text) => (
              <div className="pain-item-v2" key={text}>
                <div className="change-check">✓</div>
                <div className="change-txt">{text}</div>
              </div>
            ))}
          </Reveal>
        </div>
      </section>
    </section>
  );
}
