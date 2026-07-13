import { Reveal } from "./Reveal";
import { GoDemoTabLink } from "./GoDemoTabLink";

export function AiCopilot() {
  return (
    <section className="alt">
      <div className="sec" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "center" }}>
        <Reveal>
          <div className="eyebrow">Tu copiloto de IA ✦</div>
          <div className="sec-title">
            La IA trabaja.
            <br />
            <em>Vos decidís.</em>
          </div>
          <div className="sec-sub">
            Mientras te enfocás en las conversaciones y las decisiones, tu copiloto evalúa
            candidatos, redacta informes, genera estrategias de sourcing y prepara mensajes
            personalizados. Siempre con tu criterio al mando.
          </div>
          <div className="sol-tags" style={{ marginTop: 24 }}>
            <span className="sol-tag">Screening automático</span>
            <span className="sol-tag">Informes de entrevista</span>
            <span className="sol-tag">Boolean queries</span>
            <span className="sol-tag">Mensajes personalizados</span>
            <span className="sol-tag">Matching de pool</span>
            <span className="sol-tag">Lenguaje natural</span>
          </div>
          <div className="sol-cta">
            <GoDemoTabLink tab="asistente">Hablá con el asistente en la demo →</GoDemoTabLink>
          </div>
        </Reveal>
        <Reveal className="sol-visual">
          <div className="mini-mock">
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 12 }}>
              <span style={{ fontSize: 15 }}>✦</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--purple)" }}>Asistente WeHunter</span>
            </div>
            <div
              style={{
                background: "var(--purple)",
                color: "#fff",
                borderRadius: "12px 4px 12px 12px",
                padding: "9px 13px",
                fontSize: 12,
                marginBottom: 10,
                marginLeft: 40,
              }}
            >
              Resumime el pipeline de Acme Corp
            </div>
            <div
              style={{
                background: "var(--bg-soft)",
                border: "1px solid var(--border)",
                borderRadius: "4px 12px 12px 12px",
                padding: "10px 13px",
                fontSize: 12,
                color: "var(--ink)",
                lineHeight: 1.6,
                marginRight: 30,
              }}
            >
              18 días activa · 6 candidatos en juego. Lucas tiene entrevista mañana y Diego
              espera respuesta de oferta hace 3 días.{" "}
              <strong>¿Le mando un follow-up al cliente?</strong>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
