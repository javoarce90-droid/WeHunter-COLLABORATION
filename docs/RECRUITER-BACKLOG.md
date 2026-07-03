# Backlog atómico — Recruiter

Inventario atómico de **todo lo que puede hacer el reclutador**, reconciliado entre tres fuentes:
la **demo previa** (`wehunterats`, lo que la UI exponía), los **docs de requerimientos** de esa demo
(scope v1 vs Etapa 2), y **lo que WeHunter ya implementa hoy**.

> Objetivo: tener las piezas atómicas aisladas. Conectar los flujos entre sí es un paso posterior.
> Scope/rol = fuente de verdad el flujo de usuarios (ver `DATA_MODEL.md`). Acá NO se decide scope:
> se cataloga y se marca. **El marketplace de recruiters queda parkeado** (fuera de v1).

> **Reconciliado el 2026-06-26** contra el código real (`src/features/recruiter/` + `src/db/schema/`).
> **Actualizado el 2026-06-26**: se cerró la pantalla de **Configuración** (perfil extendido,
> cambiar contraseña, editar workspace con logo + zona horaria) y la **preview del aviso**. Con
> eso el alcance operativo de v1 queda completo. Idioma de la app y firma de email se difieren
> (no entraron al alcance acordado del perfil).

## Leyenda

- ✅ **Hecho** — caso de uso ya implementado en `src/features/recruiter/`.
- 🔲 **Falta (v1)** — en alcance operativo del recruiter, todavía no construido.
- 🔭 **Etapa 2 / IA / diferido** — la demo lo mostraba pero los docs lo marcan fuera de v1
  (IA generativa, integraciones reales, multiposting, marketplace, scraping, CRM avanzado).
- 🧱 **Falta modelo** — requiere tabla/columna nueva en `src/db/schema/` (zona compartida → coordinar).

---

## 1. Workspace / Onboarding  (`organizations` + `memberships` + `invitations`)

| | Capacidad | Nota |
|---|---|---|
| ✅ | Crear organización al registrarse (org de 1, owner) | `crearOrganization` |
| ✅ | Editar datos del workspace (nombre, logo, zona horaria) | `editarWorkspace` + `WorkspaceSection` (owner/admin) |
| ✅ | Ver/editar perfil personal del recruiter | `ProfileSection` (avatar, cargo, tel, ubicación, LinkedIn, bio≤500, "miembro desde") |
| ✅ | Cambiar contraseña | `cambiarContrasenaAction` (Supabase Auth) |
| ✅ | Invitar miembros al equipo + asignar rol (admin/recruiter) | `team` + `invitarMiembroAction` |
| ✅ | Activar/desactivar miembro; revocar invitación | `actualizarMiembroAction`, `revocarInvitacionAction` |
| 🔭 | Checklist de activación / tour / bonus IA | REQ-08, Etapa 2 |

## 2. Búsquedas (`jobs`)

| | Capacidad | Nota |
|---|---|---|
| ✅ | Crear búsqueda | `crearBusqueda` |
| ✅ | Editar búsqueda | `editarBusqueda` |
| ✅ | Cambiar estado (draft / open / paused / closed) | `cambiarEstadoBusqueda` |
| ✅ | Ver listado de búsquedas con filtros (estado, cliente, texto) | `JobsList` + `job-filters` |
| ✅ | Ver detalle / workspace de una búsqueda (tabs) | `JobTabs` + segmentos de ruta |
| ✅ | Campos ricos: ubicación, modalidad, seniority, salario, skills, prioridad, deadline, tipo contratación | columnas en `jobs` |
| ✅ | Vincular búsqueda a un cliente | `jobs.clientId` (ver §11) |
| 🔭 | Duplicar búsqueda | |
| 🔭 | Archivar búsqueda (estado extra) | 🧱 enum `job_status` |
| 🔭 | Asignar equipo a la búsqueda (owner/recruiter/consultor) | 🧱 `job_assignments` |
| 🔭 | Importar búsquedas por CSV / Google Sheets | |

## 3. Publicación / Aviso

| | Capacidad | Nota |
|---|---|---|
| ✅ | Redactar y editar el texto del aviso público | `jobs.posting` + `JobForm` |
| ✅ | Preview del aviso antes de publicar | tab `Aviso` (`jobs/[id]/aviso`) — render público read-only |
| 🔲 | Career Site: micrositio público por workspace (`/careers/{slug}`), branding + listado + postulación | Fase 1 (schema/RLS/storage) hecha; falta settings UI (Javi) y portal público (Ale) |
| 🔭 | Portal único cross-org (`/portal`, listado de todas las orgs) | sigue parkeado, es el marketplace de recruiters — no confundir con el Career Site de arriba |
| 🔭 | Multiposting (LinkedIn, bolsas) | Etapa 2 |
| 🔭 | Métricas de publicación (vistas, postulaciones, origen) | Etapa 2, ver §12 |

## 4. Candidatos / Talento (`candidates`)

| | Capacidad | Nota |
|---|---|---|
| ✅ | Cargar candidato (manual, `profile_id = null`) | `cargarCandidato` |
| ✅ | Editar candidato | `editarCandidato` |
| ✅ | Subir CV (bucket privado `cvs`) | `cv_url` |
| ✅ | Listado de talento unificado con filtros por estado operativo | `CandidatesList` + `talent-meta` |
| ✅ | Ver ficha de candidato (CV, headline, skills, summary, LinkedIn, etc.) | `candidate-details` |
| ✅ | Marcar fuente del candidato (LinkedIn, referido, manual…) | `candidates.source` + `source-meta` |
| ✅ | Pool pasivo / contactado / archivado (estados de talento) | `talentState` + `cambiarEstadoTalento` |
| ✅ | Consentimiento (`consentAcceptedAt`) | columna presente |
| 🔭 | Detectar y mergear duplicados (por email/LinkedIn) | 🧱 |
| 🔭 | Mini-bio IA, scoring IA, fortalezas/red flags | Etapa 2 / IA (campos `aiScore`/`aiSummary` ya en `applications`) |
| 🔭 | Derecho a borrado (GDPR-lite) | v1 legal mínimo |

## 5. Pipeline / Etapas (`applications`)

| | Capacidad | Nota |
|---|---|---|
| ✅ | Postular candidato a una búsqueda (entra al pipeline) | `postularCandidato` |
| ✅ | Mover candidato de etapa (transiciones validadas) | `moverEtapa`, `isValidTransition` |
| ✅ | Ver pipeline / Kanban por búsqueda | `PipelineView` |
| ✅ | Ver score/compatibilidad y badges en las cards | `aiScore` + `puntuarPostulaciones` + `stage-visual` |
| ✅ | Etapas configurables (crear/renombrar/reordenar/activar) | `pipeline-stages` + tabla `pipeline_stages` |
| ✅ | SLA por etapa | `pipeline_stages.slaDays` |
| ✅ | Ver historial de movimientos de etapa | `application_events` |
| 🔭 | Plantillas de pipeline | Etapa 2 |
| 🔭 | Badges verde/amarillo/rojo por SLA + filtro en riesgo | Etapa 2 (campo `slaDays` ya existe) |
| 🔭 | Automatizaciones al mover etapa (email/notif) | Etapa 2 |

## 6. Screening

| | Capacidad | Nota |
|---|---|---|
| 🔭 | Definir preguntas de screening por búsqueda (tipos: sí/no, texto, numérica, opción) | 🧱 `screening_questions` (sin feature) |
| 🔭 | Ver respuestas de screening del candidato | 🧱 |
| 🔭 | Screening automático con IA | Etapa 2 / IA |

## 7. Entrevistas (`interviews`)

| | Capacidad | Nota |
|---|---|---|
| ✅ | Agendar entrevista (fecha, modalidad, lugar/link, notas) | `agendarEntrevista` |
| ✅ | Editar entrevista | `actualizarEntrevista` |
| ✅ | Eliminar/cancelar entrevista | `eliminarEntrevista` |
| ✅ | Listar / agenda de entrevistas | `/agenda` — vista org-wide, próximas por día + pasadas |
| 🔭 | Tipo de entrevista (screening/técnica/comportamental/cliente) | 🧱 falta columna `type` en `interviews` |
| 🔭 | Guía de entrevista con preguntas IA; informe post-entrevista | Etapa 2 / IA |
| 🔭 | Integración Google Calendar; grabación | Etapa 2 |

## 8. Notas / Comunicación

| | Capacidad | Nota |
|---|---|---|
| ✅ | Guardar nota interna sobre la postulación | `guardarNota` / `agregarNota` |
| ✅ | Timeline de notas (varias por candidato) | tabla `notes` + `NoteTimeline` |
| ✅ | Mensajería a candidato (registro por canal) | `messaging` + `message_threads`/`messages` + `Inbox` |
| 🔭 | Envío real por email / WhatsApp / LinkedIn (integración) | Etapa 2 (WhatsApp v1.1) |
| 🔭 | Inbox de hilos Gmail/Outlook (sync externo) | Etapa 2 |
| 🔭 | Generar outreach con IA (canal + tono) | Etapa 2 / IA |

## 9. Shortlists / Sharing  (`shortlists`, `shortlist_shares`, `shortlist_feedback`)

| | Capacidad | Nota |
|---|---|---|
| ✅ | Crear shortlist de una búsqueda | `crearShortlist` |
| ✅ | Generar magic link para el cliente | `generarShare` |
| ✅ | Revocar link | `revocarShare` |
| ✅ | (Empresa) revisar shortlist por token y dejar feedback | `company/shortlist-review` |
| ✅ | Marcar candidato como shortlist/favorito desde el pipeline | `marcarFavorito` |
| ✅ | Ver feedback del cliente reflejado del lado recruiter | `ShortlistCard` (decision + comment) |
| 🔭 | Control fino de campos compartidos (qué ve el cliente) | 🧱 |

## 10. Ofertas / Cierre

| | Capacidad | Nota |
|---|---|---|
| ✅ | Generar oferta (cargo, salario, beneficios, fecha inicio) | `crearOferta` + tabla `offers` |
| ✅ | Estados de oferta (draft/enviada/negociación/aceptada/rechazada) | `cambiarEstadoOferta` |
| ✅ | PDF de la oferta | `PrintButton` + ruta `/imprimir` |
| ✅ | Cerrar búsqueda por oferta aceptada (oferta→accepted, application→hired, job→closed) | atómico en `cambiarEstadoOferta` |
| 🔭 | Enviar oferta por email | Etapa 2 |

## 11. Clientes / CRM mínimo

| | Capacidad | Nota |
|---|---|---|
| ✅ | CRUD de empresas cliente | `crearCliente` / `editarCliente` + tabla `clients` |
| ✅ | Vincular cliente ↔ búsqueda; ver búsquedas por cliente | `jobs.clientId` |
| 🔭 | Contactos del cliente, CRM completo | v1.1 / v2 |

## 12. Reportes / Analytics

| | Capacidad | Nota |
|---|---|---|
| ✅ | KPIs de dashboard (1 query) | `obtenerKpis` |
| ✅ | Funnel de conversión por etapa | `FunnelChart` / `org-report` |
| ✅ | Time-to-stage / timing por etapa | `StageTiming` (usa `application_events`) |
| ✅ | Calidad por fuente | `SourceBreakdown` |
| ✅ | Export del reporte | `ReportExport` |
| 🔭 | Rendimiento por recruiter; SLA compliance | Etapa 2 |
| 🔭 | Enviar reporte a cliente | Etapa 2 |

## 13. Configuración

| | Capacidad | Nota |
|---|---|---|
| ✅ | Perfil extendido (avatar, cargo, tel, ubicación, LinkedIn, bio) | columnas en `profiles` + `ProfileSection` |
| ✅ | Zona horaria del workspace | `organizations.preferences.timezone` (ver §1) |
| 🔭 | Idioma de la app · firma de email | diferido (fuera del alcance acordado del perfil) |
| ✅ | Notificaciones in-app | `notifications` + `NotificationBell` |
| 🔭 | Notificaciones por email / push / slack | Etapa 2 |
| 🔭 | Plan / consumo / upgrade | facturación = diferido |
| 🔭 | Integraciones (LinkedIn, Gmail, WhatsApp, Calendar, API) | Etapa 2 |

## 14. Suite IA  (todo Etapa 2)

🔭 Generar/mejorar/analizar JD · screening con IA · scoring de CV · mini-bio · query booleana de sourcing ·
mensajes outreach · guía de entrevista · "Hunti" copiloto contextual · agentes IA modal · límites/quota mensual.

## 15. Sourcing / Scraping

| | Capacidad | Nota |
|---|---|---|
| ✅ | Asistente booleano de sourcing | `sourcing` + `SourcingView` |
| 🔭 | Abrir en LinkedIn · pegar URLs / bandeja de revisión · importar a talento | diferido |
| 🔭 | Scraping multi-plataforma · exportar CSV | diferido |

## 16. Equipo / Roles avanzados

| | Capacidad | Nota |
|---|---|---|
| ✅ | Gestión básica de equipo (invitar / rol / activar / revocar) | `team` (ver §1) |
| 🔭 | `job_assignments` (asignar recruiters/consultores por búsqueda) | 🧱 |
| 🔭 | Consultor externo con acceso acotado · auditoría | Etapa 2 |

---

## Resumen del gap (2026-06-26)

- **Hecho (núcleo operativo v1 + bastante de lo que la demo marcaba Etapa 2):** búsquedas (CRUD,
  estado, filtros, detalle con tabs, campos ricos, vínculo a cliente, aviso) · candidatos (CRUD, CV,
  ficha, fuente, estados de talento, consentimiento) · pipeline (Kanban, score, etapas configurables,
  SLA por etapa, historial) · entrevistas (CRUD + agenda) · notas (timeline) · mensajería interna ·
  shortlists (crear/compartir/revocar + feedback ida y vuelta) · ofertas (CRUD, estados, PDF, cierre
  automático) · clientes (CRUD + vínculo) · reportes (KPIs, funnel, timing, fuente, export) · equipo
  (invitaciones/roles) · notificaciones in-app · sourcing booleano · **Configuración** (perfil
  extendido, cambiar contraseña, editar workspace con logo + zona horaria) · **preview del aviso**.
- **Alcance operativo de v1: completo.** No queda nada del alcance v1 del recruiter sin construir.
  Diferidos menores que la demo asociaba a esta área: idioma de la app y firma de email del perfil.
- **Etapa 2 / IA / diferido:** toda la suite IA, scraping/import de sourcing, screening, envío real
  de mensajes/ofertas e integraciones externas, automatizaciones/SLA badges, `job_assignments` y
  roles avanzados, plantillas de pipeline, CRM completo, marketplace (parkeado).
