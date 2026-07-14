import { Reveal } from "./Reveal";
import { GoDemoTabLink } from "./GoDemoTabLink";
import { WehunterLogo } from "@/components/ui/wehunter-logo";

const NAV_ITEMS = ["Dashboard", "Búsquedas", "Talento", "Clientes", "Mi equipo", "Entrevistas"];

function MiniSidebar({
  active,
  preview,
}: {
  active: string;
  preview?: string;
}) {
  return (
    <div style={{ background: "#1a0a3d", padding: "14px 10px", display: "flex", flexDirection: "column", gap: 1 }}>
      <div style={{ padding: "4px 8px 12px", borderBottom: "1px solid rgba(255,255,255,0.08)", marginBottom: 8 }}>
        <WehunterLogo variant="white" height={14} />
        <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", marginTop: 1 }}>ATS Recruiter</div>
      </div>
      {NAV_ITEMS.map((item) => (
        <div
          key={item}
          style={{
            fontSize: 11.5,
            color: item === active ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.55)",
            padding: "7px 11px",
            borderRadius: 7,
            marginBottom: 1,
            background: item === active ? "#6d28d9" : undefined,
          }}
        >
          {item}
        </div>
      ))}
      {preview && (
        <>
          <div style={{ fontSize: 9.5, color: "rgba(255,255,255,0.25)", padding: "8px 12px 4px", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            PRÓXIMAMENTE
          </div>
          <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.35)", padding: "6px 11px", borderRadius: 7 }}>
            {preview}{" "}
            <span style={{ background: "rgba(109,40,217,0.6)", color: "#e9d5ff", borderRadius: 4, padding: "1px 5px", fontSize: 9, fontWeight: 700, marginLeft: 4 }}>
              PREVIEW
            </span>
          </div>
        </>
      )}
      <div style={{ marginTop: "auto", display: "flex", gap: 7, alignItems: "center", padding: "10px 8px 4px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ width: 26, height: 26, borderRadius: "50%", background: "#6d28d9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#fff" }}>
          S
        </div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, color: "#fff" }}>Sofi</div>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)" }}>Admin</div>
        </div>
      </div>
    </div>
  );
}

function MiniMock({
  active,
  preview,
  children,
}: {
  active: string;
  preview?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="sol-visual">
      <div style={{ background: "#f5f4fb", borderRadius: 16, overflow: "hidden", border: "1px solid #e5e7eb", width: "100%" }}>
        <div style={{ display: "grid", gridTemplateColumns: "150px 1fr", minHeight: 360 }}>
          <MiniSidebar active={active} preview={preview} />
          <div style={{ background: "#fff", padding: "18px 20px", overflow: "hidden" }}>{children}</div>
        </div>
      </div>
    </div>
  );
}

export function Solutions() {
  return (
    <section id="soluciones">
      <div className="sec" style={{ paddingBottom: 20 }}>
        <Reveal style={{ textAlign: "center", maxWidth: 640, margin: "0 auto" }}>
          <div className="eyebrow" style={{ justifyContent: "center", display: "flex" }}>
            Soluciones
          </div>
          <div className="sec-title">
            Un módulo para cada
            <br />
            <em>etapa del proceso.</em>
          </div>
          <div className="sec-sub" style={{ margin: "0 auto" }}>
            Cada módulo está pensado para acompañar un momento específico del proceso de
            selección, trabajando de forma integrada con el resto de la plataforma.
          </div>
        </Reveal>

        {/* 01 */}
        <Reveal className="sol-block">
          <div className="sol-text">
            <div className="sol-num">01 — GESTIÓN COMPLETA</div>
            <div className="sol-title">Gestioná todo tu proceso de contratación</div>
            <div className="sol-lead">Desde la apertura de una vacante hasta la contratación final.</div>
            <div className="sol-desc">
              Organizá cada etapa del proceso en un único lugar. Visualizá el avance de los
              candidatos, gestioná pipelines personalizados y mantené el control de cada
              búsqueda de principio a fin.
            </div>
            <div className="sol-tags">
              <span className="sol-tag">ATS</span>
              <span className="sol-tag">Pipeline visual</span>
              <span className="sol-tag">Hiring Funnel</span>
              <span className="sol-tag">Shortlists</span>
              <span className="sol-tag">Estados personalizados</span>
              <span className="sol-tag">Seguimiento</span>
            </div>
            <div className="sol-cta">
              <GoDemoTabLink tab="busqueda">Vela en acción en la demo →</GoDemoTabLink>
            </div>
          </div>
          <MiniMock active="Búsquedas">
            <div style={{ fontSize: 10, color: "#9ca3af", marginBottom: 4 }}>
              Inicio › Búsquedas › <strong style={{ color: "#374151" }}>Dev Fullstack — Acme Corp</strong>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#111" }}>Dev Fullstack</div>
                <div style={{ fontSize: 11, color: "#9ca3af" }}>Acme Corp · 6 candidatos · 18 días activa</div>
              </div>
              <span style={{ background: "#dcfce7", color: "#15803d", borderRadius: 6, padding: "3px 9px", fontSize: 11, fontWeight: 600 }}>
                ● Activa
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 7 }}>
              <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 10, padding: 9 }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: "#111", marginBottom: 7, display: "flex", justifyContent: "space-between" }}>
                  Sourcing<span style={{ background: "#ede9fe", color: "#6d28d9", borderRadius: 100, padding: "0 6px", fontSize: 9.5 }}>3</span>
                </div>
                <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 7, padding: "7px 9px", marginBottom: 5 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#111" }}>Ana Torres</div>
                  <div style={{ fontSize: 10, color: "#9ca3af" }}>Backend · 88%</div>
                </div>
                <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 7, padding: "7px 9px" }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#111" }}>Felipe C.</div>
                  <div style={{ fontSize: 10, color: "#9ca3af" }}>Python · 72%</div>
                </div>
              </div>
              <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 10, padding: 9 }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: "#111", marginBottom: 7, display: "flex", justifyContent: "space-between" }}>
                  Contactados<span style={{ background: "#ede9fe", color: "#6d28d9", borderRadius: 100, padding: "0 6px", fontSize: 9.5 }}>4</span>
                </div>
                <div style={{ background: "#faf5ff", border: "1.5px solid #6d28d9", borderRadius: 7, padding: "7px 9px", marginBottom: 5 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#111" }}>Suri T.</div>
                  <div style={{ fontSize: 10, color: "#9ca3af" }}>RRHH · 81%</div>
                </div>
                <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 7, padding: "7px 9px" }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#111" }}>Carlos F.</div>
                  <div style={{ fontSize: 10, color: "#9ca3af" }}>Ventas · 65%</div>
                </div>
              </div>
              <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 10, padding: 9 }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: "#111", marginBottom: 7, display: "flex", justifyContent: "space-between" }}>
                  Entrevista<span style={{ background: "#ede9fe", color: "#6d28d9", borderRadius: 100, padding: "0 6px", fontSize: 9.5 }}>2</span>
                </div>
                <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 7, padding: "7px 9px" }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#111" }}>Martín R.</div>
                  <div style={{ fontSize: 10, color: "#9ca3af" }}>Económicas · 78%</div>
                </div>
              </div>
              <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 10, padding: 9 }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: "#111", marginBottom: 7, display: "flex", justifyContent: "space-between" }}>
                  Finalistas<span style={{ background: "#ede9fe", color: "#6d28d9", borderRadius: 100, padding: "0 6px", fontSize: 9.5 }}>2</span>
                </div>
                <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 7, padding: "7px 9px" }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#111" }}>Luciana G.</div>
                  <div style={{ fontSize: 10, color: "#9ca3af" }}>Admin · 91%</div>
                </div>
              </div>
            </div>
          </MiniMock>
        </Reveal>

        {/* 02 */}
        <Reveal className="sol-block rev">
          <div className="sol-text">
            <div className="sol-num">02 — TALENT POOL</div>
            <div className="sol-title">Centralizá todas tus fuentes de talento</div>
            <div className="sol-lead">Todos tus candidatos. Un solo lugar.</div>
            <div className="sol-desc">
              Construí una base de talento propia y reutilizable para futuras búsquedas.
              Encontrá perfiles rápidamente, registrá interacciones y mantené el historial
              completo de cada candidato.
            </div>
            <div className="sol-tags">
              <span className="sol-tag">Talent Pool</span>
              <span className="sol-tag">Base de candidatos</span>
              <span className="sol-tag">Búsqueda avanzada</span>
              <span className="sol-tag">Filtros por skills</span>
              <span className="sol-tag">Historial</span>
              <span className="sol-tag">Notas</span>
            </div>
          </div>
          <MiniMock active="Talento">
            <div style={{ fontSize: 10, color: "#9ca3af", marginBottom: 4 }}>
              Inicio › <strong style={{ color: "#374151" }}>Talento</strong>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#111" }}>Talento</div>
                <div style={{ fontSize: 11, color: "#9ca3af" }}>16 candidatos en el pool</div>
              </div>
              <button style={{ background: "#6d28d9", color: "#fff", border: "none", borderRadius: 8, padding: "6px 12px", fontSize: 11, fontWeight: 600, fontFamily: "var(--font-manrope)" }}>
                + Agregar candidato
              </button>
            </div>
            <input
              style={{ width: "100%", fontSize: 11, padding: "7px 10px", borderRadius: 8, border: "1px solid #d1d5db", marginBottom: 10, fontFamily: "var(--font-manrope)", color: "#9ca3af" }}
              placeholder="Buscar por nombre, email, título o skill..."
              readOnly
            />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[
                { initials: "IL", name: "Irene Luna", role: "PM freelance", tags: ["Producto", "Agile", "Discovery"], origin: "Origen: Demo flujo" },
                { initials: "HS", name: "Hugo Silva", role: "Head of Product", tags: ["Producto", "Agile"], origin: "Origen: Demo flujo" },
                { initials: "VS", name: "Valentina Sosa", role: "QA Engineer", tags: ["Playwright", "Jest"], origin: "Origen: Referido" },
                { initials: "SR", name: "Sofía Ruiz", role: "Analista Jr", tags: ["SQL", "Python"], origin: "Origen: Demo seed" },
              ].map((c) => (
                <div key={c.name} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "12px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 8 }}>
                    <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#ede9fe", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#6d28d9" }}>
                      {c.initials}
                    </div>
                    <div>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: "#111" }}>{c.name}</div>
                      <div style={{ fontSize: 10.5, color: "#9ca3af" }}>{c.role}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 6 }}>
                    {c.tags.map((t) => (
                      <span key={t} style={{ background: "#ede9fe", color: "#6d28d9", borderRadius: 100, padding: "2px 8px", fontSize: 10, fontWeight: 600 }}>
                        {t}
                      </span>
                    ))}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: 10.5, color: "#9ca3af" }}>{c.origin}</span>
                  </div>
                  <div style={{ textAlign: "right", fontSize: 10.5, color: "#6d28d9", fontWeight: 600, marginTop: 4 }}>Ver ficha →</div>
                </div>
              ))}
            </div>
          </MiniMock>
        </Reveal>

        {/* 03 */}
        <Reveal className="sol-block">
          <div className="sol-text">
            <div className="sol-num">03 — MULTIPOSTING</div>
            <div className="sol-title">Atraé talento desde múltiples canales</div>
            <div className="sol-lead">Publicá una vez. Gestioná todo desde WeHunter.</div>
            <div className="sol-desc">
              Creá vacantes, publicalas en distintos canales y recibí todas las postulaciones
              centralizadas en una única plataforma.
            </div>
            <div className="sol-tags">
              <span className="sol-tag">Multiposting</span>
              <span className="sol-tag">Career Site</span>
              <span className="sol-tag">Portal de empleos</span>
              <span className="sol-tag">Gestión de postulaciones</span>
              <span className="sol-tag">Centralización</span>
            </div>
          </div>
          <MiniMock active="Búsquedas">
            <div style={{ fontSize: 10, color: "#9ca3af", marginBottom: 4 }}>
              Inicio › Búsquedas › <strong style={{ color: "#374151" }}>Nueva búsqueda</strong>
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#111", marginBottom: 4 }}>Python Developer Sr</div>
            <div style={{ display: "flex", gap: 4, marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: "#9ca3af", padding: "3px 8px", borderRadius: 100, border: "1px solid #e5e7eb", background: "#f9fafb" }}>
                Paso 4 de 5
              </div>
              <div style={{ fontSize: 10, color: "#9ca3af", padding: "3px 8px" }}>
                Datos · Descripción · Screening · <strong style={{ color: "#6d28d9" }}>Visibilidad</strong> · Preview
              </div>
            </div>
            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "14px 16px" }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: "#111", marginBottom: 12 }}>Publicar en canales</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 9, marginBottom: 14 }}>
                {["Portal WeHunter", "LinkedIn", "Career Site"].map((canal) => (
                  <div key={canal} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 12px", border: "1.5px solid #6d28d9", borderRadius: 9, background: "#faf5ff" }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#111" }}>{canal}</span>
                    <span style={{ fontSize: 11, color: "#6d28d9", fontWeight: 700 }}>✓ Activo</span>
                  </div>
                ))}
              </div>
              <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: 11, fontSize: 11.5, color: "#9ca3af" }}>
                38 postulaciones recibidas → todas centralizadas en tu ATS
              </div>
            </div>
          </MiniMock>
        </Reveal>

        {/* 04 */}
        <Reveal className="sol-block rev">
          <div className="sol-text">
            <div className="sol-num">04 — COLABORACIÓN</div>
            <div className="sol-title">Colaborá con clientes y equipos</div>
            <div className="sol-lead">Todos alineados durante el proceso.</div>
            <div className="sol-desc">
              Compartí candidatos, recibí feedback y mantené involucrados a clientes, hiring
              managers y colaboradores sin depender de cadenas interminables de correos o
              mensajes.
            </div>
            <div className="sol-tags">
              <span className="sol-tag">Compartir shortlists</span>
              <span className="sol-tag">Vista cliente</span>
              <span className="sol-tag">Feedback colaborativo</span>
              <span className="sol-tag">Roles y permisos</span>
              <span className="sol-tag">Equipos</span>
            </div>
            <div className="sol-cta">
              <GoDemoTabLink tab="dashboard">Mirá la vista cliente en la demo →</GoDemoTabLink>
            </div>
          </div>
          <MiniMock active="Clientes">
            <div style={{ fontSize: 10, color: "#9ca3af", marginBottom: 4 }}>
              Inicio › Clientes › <strong style={{ color: "#374151" }}>Acme Corp</strong>
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#111", marginBottom: 12 }}>Vista cliente — Dev Fullstack</div>
            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "14px 16px", marginBottom: 9 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#111", marginBottom: 10 }}>Candidatos presentados</div>
              <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 0", borderBottom: "1px solid #f3f4f6" }}>
                <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#ede9fe", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#6d28d9" }}>
                  LG
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#111" }}>Luciana G.</div>
                  <div style={{ fontSize: 10.5, color: "#9ca3af" }}>Admin · 5 años</div>
                </div>
                <span style={{ background: "#dcfce7", color: "#15803d", borderRadius: 6, padding: "2px 9px", fontSize: 10.5, fontWeight: 600 }}>Finalista</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 0" }}>
                <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#ede9fe", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#6d28d9" }}>
                  MR
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#111" }}>Martín R.</div>
                  <div style={{ fontSize: 10.5, color: "#9ca3af" }}>Económicas · 7 años</div>
                </div>
                <span style={{ background: "#ede9fe", color: "#6d28d9", borderRadius: 6, padding: "2px 9px", fontSize: 10.5, fontWeight: 600 }}>Entrevista</span>
              </div>
            </div>
            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "14px 16px" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#111", marginBottom: 9 }}>Feedback del cliente</div>
              <div style={{ background: "#f0fdf4", borderRadius: 9, padding: "11px 13px", marginBottom: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#15803d", marginBottom: 4 }}>Le interesa avanzar ✓</div>
                <div style={{ fontSize: 11.5, color: "#374151" }}>&quot;Quisiéramos coordinar una entrevista con Luciana.&quot;</div>
              </div>
              <div style={{ fontSize: 11, color: "#9ca3af" }}>Respondió en 4 horas · sin un solo email</div>
            </div>
          </MiniMock>
        </Reveal>

        {/* 05 */}
        <Reveal className="sol-block">
          <div className="sol-text">
            <div className="sol-num">05 — ENTREVISTAS</div>
            <div className="sol-title">Entrevistá mejor y documentá menos</div>
            <div className="sol-lead">Convertí cada entrevista en información accionable.</div>
            <div className="sol-desc">
              Gestioná entrevistas, registrá evaluaciones y generá informes estructurados
              listos para compartir. Pegá una transcripción o tus notas y WeHunter genera un
              informe claro con IA. Menos tiempo redactando. Más tiempo evaluando talento.
            </div>
            <div className="sol-tags">
              <span className="sol-tag">Agenda integrada</span>
              <span className="sol-tag">Calendario</span>
              <span className="sol-tag">Evaluaciones</span>
              <span className="sol-tag">Feedbacks</span>
              <span className="sol-tag">Recordatorios</span>
              <span className="sol-tag">Informes con IA ✦</span>
            </div>
          </div>
          <MiniMock active="Entrevistas">
            <div style={{ fontSize: 10, color: "#9ca3af", marginBottom: 4 }}>
              Inicio › <strong style={{ color: "#374151" }}>Entrevistas</strong>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#111" }}>Entrevistas</div>
                <div style={{ fontSize: 11, color: "#9ca3af" }}>Vista semanal · planificación diaria</div>
              </div>
              <button style={{ background: "#6d28d9", color: "#fff", border: "none", borderRadius: 8, padding: "6px 12px", fontSize: 11, fontWeight: 600, fontFamily: "var(--font-manrope)" }}>
                📅 Agendar
              </button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 6, marginBottom: 12 }}>
              {[
                { l: "LUN", n: 15, active: true },
                { l: "MAR", n: 16, active: false },
                { l: "MIÉ", n: 17, active: false },
                { l: "JUE", n: 18, active: false },
                { l: "VIE", n: 19, active: false },
              ].map((d) => (
                <div
                  key={d.l}
                  style={{
                    border: d.active ? "1.5px solid #6d28d9" : "1px solid #e5e7eb",
                    borderRadius: 9,
                    padding: "7px 5px",
                    textAlign: "center",
                    background: d.active ? "#faf5ff" : undefined,
                  }}
                >
                  <div style={{ fontSize: 9, color: d.active ? "#6d28d9" : "#9ca3af", fontWeight: d.active ? 700 : 400 }}>{d.l}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: d.active ? "#6d28d9" : "#374151" }}>{d.n}</div>
                </div>
              ))}
            </div>
            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "14px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
                <span style={{ color: "#6d28d9", fontSize: 13 }}>♦</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#6d28d9" }}>Informe generado con IA</span>
              </div>
              <div style={{ fontSize: 12, color: "#374151", lineHeight: 1.6, marginBottom: 8 }}>
                Candidata con sólida experiencia en Python y liderazgo de equipos. Gap menor:
                inglés. <strong>Recomendación: avanzar a entrevista técnica.</strong>
              </div>
              <div style={{ fontSize: 11, color: "#9ca3af" }}>Generado en 8 segundos desde tus notas</div>
            </div>
          </MiniMock>
        </Reveal>

        {/* 06 */}
        <Reveal className="sol-block rev">
          <div className="sol-text">
            <div className="sol-num">06 — SOURCING CON IA</div>
            <div className="sol-title">Encontrá talento más rápido con IA</div>
            <div className="sol-lead">Menos búsqueda manual. Más candidatos relevantes.</div>
            <div className="sol-desc">
              Generá búsquedas booleanas, construí estrategias de sourcing y acelerá la
              identificación de perfiles para cada vacante.
            </div>
            <div className="sol-tags">
              <span className="sol-tag">Sourcing asistido</span>
              <span className="sol-tag">Queries booleanas</span>
              <span className="sol-tag">IA aplicada</span>
              <span className="sol-tag">Talent Discovery</span>
              <span className="sol-tag">Bandejas de revisión</span>
            </div>
            <div className="sol-cta">
              <GoDemoTabLink tab="asistente">Probá la búsqueda con IA en la demo →</GoDemoTabLink>
            </div>
          </div>
          <MiniMock active="Búsquedas" preview="Sourcing ✦">
            <div style={{ fontSize: 10, color: "#9ca3af", marginBottom: 4 }}>
              Inicio › <strong style={{ color: "#374151" }}>Sourcing ✦</strong>
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#111", marginBottom: 12 }}>Asistente de Sourcing IA</div>
            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "14px 16px", marginBottom: 9 }}>
              <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 6 }}>Búsqueda: Python Developer Sr — Acme Corp</div>
              <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                <span style={{ background: "#6d28d9", color: "#fff", borderRadius: 100, padding: "4px 12px", fontSize: 11, fontWeight: 600 }}>LinkedIn</span>
                <span style={{ background: "#f3f4f6", color: "#6b7280", borderRadius: 100, padding: "4px 12px", fontSize: 11, fontWeight: 500 }}>GitHub</span>
                <span style={{ background: "#f3f4f6", color: "#6b7280", borderRadius: 100, padding: "4px 12px", fontSize: 11, fontWeight: 500 }}>X-Ray</span>
              </div>
              <div style={{ fontSize: 9.5, fontWeight: 700, color: "#6d28d9", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
                BOOLEAN STRING GENERADA ♦
              </div>
              <div style={{ background: "#f8f7fd", border: "1px solid #ede9fe", borderRadius: 8, padding: "10px 12px", fontFamily: "monospace", fontSize: 11, color: "#374151", lineHeight: 1.6, marginBottom: 8 }}>
                (&quot;Python developer&quot; OR &quot;Backend engineer&quot;) AND (Django OR
                FastAPI) AND &quot;Buenos Aires&quot; NOT junior
              </div>
              <div style={{ fontSize: 11, color: "#9ca3af" }}>~2.400 resultados estimados · LinkedIn Argentina</div>
            </div>
            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "12px 16px" }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: "#111", marginBottom: 8 }}>Candidatos encontrados</div>
              <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "6px 0", borderBottom: "1px solid #f3f4f6" }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#ede9fe", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#6d28d9" }}>
                  ML
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 600, color: "#111" }}>María López</div>
                  <div style={{ fontSize: 10, color: "#9ca3af" }}>Python Sr · 7 años · BA</div>
                </div>
                <span style={{ background: "#dcfce7", color: "#15803d", borderRadius: 100, padding: "2px 9px", fontSize: 10.5, fontWeight: 600 }}>94%</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "6px 0" }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#ede9fe", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#6d28d9" }}>
                  LM
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 600, color: "#111" }}>Lucas Méndez</div>
                  <div style={{ fontSize: 10, color: "#9ca3af" }}>Python Sr · 6 años · Remoto</div>
                </div>
                <span style={{ background: "#ede9fe", color: "#6d28d9", borderRadius: 100, padding: "2px 9px", fontSize: 10.5, fontWeight: 600 }}>92%</span>
              </div>
            </div>
          </MiniMock>
        </Reveal>

        {/* 07 */}
        <Reveal className="sol-block">
          <div className="sol-text">
            <div className="sol-num">07 — REPORTES</div>
            <div className="sol-title">Tomá decisiones con datos</div>
            <div className="sol-lead">Convertí actividad en información accionable.</div>
            <div className="sol-desc">
              Visualizá el rendimiento de tus búsquedas, detectá cuellos de botella y entendé
              qué está funcionando para optimizar tu operación de recruiting.
            </div>
            <div className="sol-tags">
              <span className="sol-tag">Funnel por etapa</span>
              <span className="sol-tag">Métricas operativas</span>
              <span className="sol-tag">Reportes exportables</span>
              <span className="sol-tag">Performance</span>
              <span className="sol-tag">Fuentes de candidatos</span>
            </div>
            <div className="sol-cta">
              <GoDemoTabLink tab="dashboard">Mirá los KPIs en la demo →</GoDemoTabLink>
            </div>
          </div>
          <MiniMock active="Búsquedas" preview="Reportes">
            <div style={{ fontSize: 10, color: "#9ca3af", marginBottom: 4 }}>
              Inicio › <strong style={{ color: "#374151" }}>Reportes</strong>
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#111", marginBottom: 12 }}>Reportes</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 10 }}>
              <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "11px 13px" }}>
                <div style={{ fontSize: 10, color: "#9ca3af", marginBottom: 3 }}>Candidatos activos</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#111" }}>87</div>
                <div style={{ fontSize: 10, background: "#ede9fe", color: "#6d28d9", borderRadius: 100, display: "inline-block", padding: "1px 7px", marginTop: 3, fontWeight: 600 }}>
                  12 búsquedas
                </div>
              </div>
              <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "11px 13px" }}>
                <div style={{ fontSize: 10, color: "#9ca3af", marginBottom: 3 }}>Tiempo promedio</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#111" }}>18d</div>
                <div style={{ fontSize: 10, background: "#dcfce7", color: "#15803d", borderRadius: 100, display: "inline-block", padding: "1px 7px", marginTop: 3, fontWeight: 600 }}>
                  En tiempo
                </div>
              </div>
              <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "11px 13px" }}>
                <div style={{ fontSize: 10, color: "#9ca3af", marginBottom: 3 }}>Tasa de cierre</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#111" }}>21%</div>
                <div style={{ fontSize: 10, background: "#fef3c7", color: "#92400e", borderRadius: 100, display: "inline-block", padding: "1px 7px", marginTop: 3, fontWeight: 600 }}>
                  Mejorable
                </div>
              </div>
            </div>
            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "14px 16px" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#111", marginBottom: 11 }}>Embudo de selección</div>
              {[
                { label: "Preseleccionados", pct: 100, n: 14, color: "#6d28d9" },
                { label: "Entrevistados", pct: 64, n: 9, color: "#7c3aed" },
                { label: "Finalistas", pct: 21, n: 3, color: "#a78bfa" },
              ].map((row, i) => (
                <div key={row.label} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: i < 2 ? 6 : 0 }}>
                  <div style={{ fontSize: 10.5, color: "#555", minWidth: 88 }}>{row.label}</div>
                  <div style={{ flex: 1, background: "#f3f4f6", borderRadius: 100, height: 20, overflow: "hidden" }}>
                    <div style={{ width: `${row.pct}%`, height: 20, background: row.color, borderRadius: 100, display: "flex", alignItems: "center", padding: "0 8px" }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: "#fff" }}>{row.n}</span>
                    </div>
                  </div>
                  <div style={{ fontSize: 10, color: "#888", minWidth: 26 }}>{row.pct}%</div>
                </div>
              ))}
            </div>
          </MiniMock>
        </Reveal>
      </div>
    </section>
  );
}
