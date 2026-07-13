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
> **Actualizado el 2026-07-06**: triage de 12 tarjetas de Trello del cliente contra este backlog
> y el flujo confirmado. Decisiones del cliente reflejadas abajo; detalle en §17–18.
> **Actualizado el 2026-07-10**: ordenados por complejidad los ítems confirmados-no-arrancados
> (§1, §7, §8, §9, §11, §17) para planificar el avance. Se construyeron §1 (onboarding tour),
> la parte de §9 "Participación de Clientes Externos" (pedido de entrevista desde la revisión
> de shortlist) y §7 (integración Google Calendar — código completo, pendiente que cargues
> credenciales reales de Google Cloud para que funcione de verdad). Se decidió parquear §11 y
> la parte de §9 "control fino de campos compartidos/HM" hasta que arranque §17. Siguiente:
> WhatsApp real (§8) o §17, a definir.
> **Actualizado el 2026-07-10 (segunda parte)**: WhatsApp real (§8) investigado — es una
> decisión de negocio (proveedor + alcance), no solo técnica. Se mandó comentario a Trello y
> quedó pendiente de que el cliente responda. Se sumó una propuesta alternativa sin
> dependencias externas: click-to-chat por `wa.me` (construido) + campo de teléfono en el alta
> manual de candidato (construido).
> **Actualizado el 2026-07-10 (tercera parte)**: el cliente respondió — **se descarta la
> integración real de WhatsApp** (Twilio/Meta Business API). Queda **cerrado** con el
> click-to-chat (`wa.me`) como solución para este canal. §8 sin pendientes.
> **Actualizado el 2026-07-10 (cuarta parte)**: reconciliación contra el board completo de
> Trello (export JSON, 71 tarjetas — más grande que el `.ods` de 12 del 2026-07-06). Resuelto
> con el usuario: WhatsApp confirma (ya alineado); "Visibilidad de Notas con HM" en DONE era
> error de Trello del usuario (se corrige ahí, acá sigue parkeada sin cambios); "Campañas
> Inteligentes sobre Talent Pool" pasa a este backlog sin descripción (pendiente detalle del
> cliente); "Descarte masivo de postulados" **sí existe** (`rechazarVariosAction` — corrección
> a un hallazgo previo equivocado); "Informes de Entrevista con IA" confirmado sin arrancar.
> **Hallazgo clave**: la tarjeta de Trello "Solicitud de búsqueda + Participantes en la
> búsqueda" es un módulo "Hiring Request" mucho más detallado que §17, y aplica a los **tres
> modelos** (Enterprise, Consultora, Freelance) — no solo Enterprise. Pasa a ser la referencia
> real para cuando se descomponga §17 (ver nota dentro de esa sección).
> **Actualizado el 2026-07-10 (quinta parte)**: catalogadas todas las tarjetas nuevas del board
> que faltaban — §1 (email real de invitación + rol "Viewer/Observador" ❓), §5 (estados
> visibles al candidato), §8 (banner de privacidad de notas), §3 (recomendación de no fusionar
> Career Site con Comunidad), §17 (reescrito con el detalle de "Hiring Request" + Participantes
> de la búsqueda). Nuevas §19 (candidate-side, fuera de este doc) y §20 (11 bugs reportados,
> sin triagear). **Con esto, Trello y este backlog quedan alineados** — el usuario decidirá
> alcance de cada ❓/🔲 nuevo más adelante, este doc solo cataloga. Ver memoria
> `trello-json-reconciliation-2026-07`.
> **Actualizado el 2026-07-10 (sexta parte)**: leídos los 2 `.docx` adjuntos a la tarjeta [51]
> "Gestión de Candidatos Compartidos" — detallado en §19. ⚠️ **No es candidate-side chico**:
> pide un Talent ID único **compartido entre organizations** (candidato único cross-tenant, con
> capa privada por-recruiter encima), lo que tensiona el principio "toda tabla lleva
> `organization_id`, sin excepción" de `database.md` y roza la estrategia de marketplace
> parkeada. Es la pieza de mayor impacto estructural de toda esta reconciliación — no se
> propuso implementación, queda solo catalogado a la espera de que el usuario decida.

## Leyenda

- ✅ **Hecho** — caso de uso ya implementado en `src/features/recruiter/`.
- 🔲 **Falta (v1)** — en alcance operativo del recruiter, todavía no construido.
- 🔭 **Etapa 2 / IA / diferido** — la demo lo mostraba pero los docs lo marcan fuera de v1
  (IA generativa, integraciones reales, multiposting, marketplace, scraping, CRM avanzado).
- 🧱 **Falta modelo** — requiere tabla/columna nueva en `src/db/schema/` (zona compartida → coordinar).
- ❓ **Pendiente de confirmación con cliente** — se habló informalmente pero no hay acuerdo
  explícito; no es alcance hasta que el cliente lo confirme por escrito.
- ❌ **Descartado** — decisión de producto: no entra, no se construye.

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
| 🔲 | Email real de invitación por rol (hoy el envío es mock) | Trello [45] "Invitaciones y Accesos" trae el copy completo por rol: Admin, Recruiter, Consultor Externo, HM, Viewer/Observador, Cliente Externo (magic link), Candidato, encuesta de satisfacción. Confirmado 2026-07-10, no arrancado |
| ❓ | Rol nuevo "Viewer / Observador" (acceso de solo lectura a búsquedas asignadas) | Trello [45] lo menciona como rol propio — **no existe** en `orgRole` hoy (`owner\|admin\|recruiter\|consultant`). Pendiente de confirmar si es alcance real o se resuelve con el rol `consultant` existente |
| ✅ | Checklist de activación / tour | REQ-08. Hecho 2026-07-10: tour guiado paso a paso (`src/features/recruiter/onboarding-tour`), descartable/retomable desde Configuración, persistencia por membership (no por org). Sin el paso de "Identidad" (logo/firma/redes) — ese queda con §18 Centro de Comunicaciones |

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
| 🔲 | Career Site: micrositio público por workspace (`/careers/{slug}`), branding + listado + postulación | Fase 1 (schema/RLS/storage) hecha; falta settings UI (Javi) y portal público (Ale). Trello [48] confirma: **Career Site es obligatorio para todo workspace** (freelance, consultora o empresa), independiente de si activa la Comunidad — no fusionar ambas cosas |
| 🔭 | Portal único cross-org (`/portal`, listado de todas las orgs) | sigue parkeado, es el marketplace de recruiters — no confundir con el Career Site de arriba. Ver ❓ §18 (cliente lo repidió en Trello como "Comunidad de Recruiters"). Trello [48] trae una recomendación de producto explícita: **NO fusionar** Career Site (atraer candidatos, obligatorio) con Perfil Comunidad (atraer clientes, opcional) — son dos públicos distintos, útil para cuando se retome §18 |
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
| 🔭 | Mini-bio IA, scoring IA, fortalezas/red flags | Etapa 2 / IA (campos `aiScore`/`aiSummary` ya en `applications`). Trello (JSON board 2026-07-10) trae este ítem mucho más elaborado que esta línea — ver tarjetas "Match Score + confianza del IA análisis" y "Potenciar Perfil del Candidato" cuando se arranque |
| 🔭 | Derecho a borrado (GDPR-lite) | v1 legal mínimo |
| ❓ | Campañas Inteligentes sobre Talent Pool | Trello (JSON board 2026-07-10), tarjeta sin descripción — pendiente que el cliente la detalle antes de poder catalogarla como alcance real |

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
| ✅ | Rechazar postulación individual o masiva (motivo, nota, notificación opcional al candidato) | `rechazarVariosAction` + `PostuladosTable` (selección múltiple) |
| 🔭 | Plantillas de pipeline | Etapa 2 |
| 🔭 | Badges verde/amarillo/rojo por SLA + filtro en riesgo | Etapa 2 (campo `slaDays` ya existe) |
| 🔭 | Automatizaciones al mover etapa (email/notif) | Etapa 2 |
| 🔲 | Mapeo de etapas internas → estados simplificados visibles para el candidato + reglas de cuándo notificar | Trello [30] "Estados visibles y notificaciones al candidato". Confirmado 2026-07-10, no arrancado. Es mitad recruiter (config del mapeo) mitad candidate-side (dónde se ve — portal de Ale) |

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
| 🔭 | Guía de entrevista con preguntas IA; informe post-entrevista | Etapa 2 / IA. Sin arrancar (confirmado 2026-07-10, corregido de "IN PROGRESS" a backlog en Trello). Detalle real de la tarjeta (JSON board): transcripción de la entrevista (carga manual, pegar texto, o integraciones futuras Meet/Teams/Zoom), la IA la usa como fuente principal para generar el informe/scorecard (fortalezas, riesgos, competencias), acciones de ver/editar/descargar transcripción y regenerar informe |
| ✅ | Integración Google Calendar: agendar desde la app + agregar participantes a la entrevista | Hecho 2026-07-10: OAuth por recruiter (`src/features/recruiter/google-calendar`), sync automática create/update/cancel/delete, participantes = equipo (selector) + emails externos. **Pendiente de vos:** cargar `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` reales en Google Cloud Console (ver `.env.example`) — sin eso la integración queda inactiva sin romper nada, pero no funciona de verdad todavía |
| 🔭 | Grabación de entrevista | Etapa 2 |

## 8. Notas / Comunicación

| | Capacidad | Nota |
|---|---|---|
| ✅ | Guardar nota interna sobre la postulación | `guardarNota` / `agregarNota` |
| ✅ | Timeline de notas (varias por candidato) | tabla `notes` + `NoteTimeline` |
| 🔲 | Banner "🔒 estas notas solo las ves vos" en la sección Notas | Trello [52]. Chico — formaliza en la UI algo que ya es cierto hoy (las notas nunca se exponen al share/portal, confirmado al construir §9). Confirmado 2026-07-10, no arrancado |
| ✅ | Mensajería a candidato (registro por canal) | `messaging` + `message_threads`/`messages` + `Inbox` |
| ❌ | Envío real de WhatsApp vía Business API (Twilio / Meta Cloud API) | Investigado 2026-07-10 (riesgos de proveedor, verificación de Meta por-organización, regla de plantillas para contacto en frío — ver memoria `whatsapp-real-pending-2026-07`). **Resuelto con el cliente 2026-07-10: descartado.** Se queda con la alternativa simple de abajo (click-to-chat) en vez de la integración completa |
| ✅ | Click-to-chat: tocar el teléfono de un candidato abre WhatsApp Web/app con ese número | Hecho 2026-07-10: fact "Teléfono" en la ficha del candidato (`/candidates/[id]`), link `wa.me` si hay teléfono cargado. Sin número por-organización ni credenciales — cada recruiter usa su propio WhatsApp. No registra nada en `messages`/Inbox, es un atajo de UI. `CandidateForm` (alta/edición manual) ahora también tiene campo de teléfono, así que ya se puede cargar para cualquier candidato, no solo los que llegan por Career Site/autoservicio |
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
| ✅ | Cliente puede solicitar entrevista desde la revisión de shortlist | Hecho 2026-07-10: `request_shortlist_interview` (función definer) + `RequestInterviewButton`, notifica a la org y se ve como badge en `ShortlistCard` |
| 🔭 | Control fino de campos compartidos (qué ve el cliente) | 🧱. Confirmado 2026-07-06 (Trello "Visibilidad de Notas con HM"). **Parkeado 2026-07-10**: la parte "para HM" no se puede construir sin §17; la parte "para Cliente" sigue sin alcance atómico decidido. Ver memoria `recruiter-backlog-notes-hm-parked-2026-07` |

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
| 🔲 | Distinguir Cliente vs Hiring Manager según tipo de Workspace (mismo módulo técnico, distinta etiqueta) | confirmado 2026-07-06 (Trello "Gestión de Clientes/HM", implementación directa del "Modelo de usuarios"). **Parkeado 2026-07-10**: no se construye suelto, va atado al arranque de §17 (`docs/DATA_MODEL.md` ya lo deja así). Ver memoria `recruiter-backlog-11-parked-2026-07` |
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

> ❌ **Descartado 2026-07-06** (Trello "Insights IA / Copiloto"): un agente autónomo que ejecuta
> tareas operativas por su cuenta. El copiloto contextual de arriba se limita a resúmenes/alertas,
> no a acción autónoma. Ver §18.

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

## 17. Empresa / Hiring Manager (Enterprise) — y "Hiring Request" transversal

Capa "Empresa/HM" del flujo confirmado (pasos 1–8 del PDF). Confirmado 2026-07-06 (Trello
"Participación de Hiring Managers Enterprise") — coincide con el "Modelo de usuarios" (§1/§11),
no es scope creep, pero es trabajo real y **no arrancado**. Falta descomponer en tareas atómicas.

> **Corrección 2026-07-10** (Trello JSON board, tarjeta [70] "Solicitud de búsqueda +
> Participantes en la búsqueda"): esa tarjeta es la spec real y mucho más detallada de este
> módulo — le dicen **"Hiring Request"**. Dato clave que cambia el encuadre: **no es exclusivo
> de Enterprise**. Aplica a los **tres modelos** por igual (Enterprise → HM le pide la vacante a
> Talent Acquisition; Consultora → el recruiter le manda un Hiring Brief a su cliente; Freelance
> → mismo Hiring Brief a su cliente). El flujo es el mismo, solo cambia quién lo inicia. Cuando
> se arranque este bloque, usar la tarjeta [70] como fuente de verdad del detalle (bloques de la
> Job Position, botones "sugerir con IA" por bloque, matching automático al Talent Pool al
> crear la búsqueda), no reinventar la spec acá — este backlog solo cataloga, el scope real lo
> define el usuario.

| | Capacidad | Nota |
|---|---|---|
| 🔲 | HM/Cliente solicita una búsqueda (Hiring Request): form corto o IA conversacional (Huntie) + JD asistida por IA (soft/hard skills, experiencia, educación, responsabilidades, objetivos, beneficios, excluyentes/deseables) | confirmado, no arrancado. Ver `DATA_MODEL.md` "Modelo de usuarios" + Trello [70]. La JD con IA es Suite IA (§14) |
| 🔲 | Recruiter valida/aprueba la solicitud → se crea el `job` vinculado en estado Borrador | confirmado, no arrancado — la requisition no reemplaza al job, lo genera |
| 🔲 | Participantes de la búsqueda: catálogo de roles (HM, Cliente, Recruiter, Entrevistador Técnico, Director, etc.) + ventana de participación por etapa del pipeline (desde/hasta), configurado una sola vez y reusado en todo el ciclo | Trello [70] "Paso 3". Se solapa con `job_assignments` 🧱 (§16) pero es más rico (roles + ventana por etapa, no solo asignación plana) |
| 🔲 | Matching automático con el Talent Pool al crear la búsqueda (cantidad de compatibles, Match Score, fortalezas/brechas) | Trello [70] "Paso 6" — Suite IA (§14) |
| 🔲 | HM/Cliente ve el estado de sus solicitudes | confirmado, no arrancado |
| 🔲 | HM/Cliente revisa candidatos y deja feedback | confirmado, no arrancado — se solapa con §9 (shortlists); para el modelo Cliente puede ser la misma superficie que ya existe (magic link), para HM es nuevo (requiere cuenta) |
| 🔲 | HM/Cliente coordina entrevistas | confirmado, no arrancado — ver §7 (solo Google Calendar) |
| 🔲 | Reporte para HM/Cliente | confirmado, no arrancado — puede solaparse con §12 |

## 18. Descartadas / parkeadas (sin acción por ahora)

De las 12 tarjetas de Trello originales, estas 4 no avanzan. Ninguna requiere volver al
cliente por ahora — quedan cerradas hasta que surja de otra parte.

| | Capacidad | Nota |
|---|---|---|
| 🔭 | Visibilidad en Comunidad de Recruiters (perfil público cross-org) | sigue parkeada (§3, es el marketplace). Decidido 2026-07-06: eventualmente **podría** entrar en una versión mínima ("solo vidriera", sin funcionalidad de marketplace real), pero no ahora — no tratar como alcance |
| 🔭 | Encuesta de Feedback al Cliente / Reputación | parkeada junto con el ítem anterior (depende 100% de él) |
| ❌ | Agente IA autónomo que ejecuta tareas operativas por su cuenta | descartado 2026-07-06: "una flasheada", no entra. El copiloto de insights/alertas (§14) sigue en pie, esto era solo la parte de agente autónomo |
| ❌ | Centro de Comunicaciones y Templates (motor de templates completo + 4 canales + branding + historial) | descartado 2026-07-06: es agrandar el producto más allá de lo acordado (antecedente chico en §8/§10, esto bundlea una feature grande nueva con un "Chat Interno WeHunter" que no existe en ningún lado). Trello [50] "Comunicaciones y Templates: Automatización + Personalización" (JSON board 2026-07-10) es la misma idea repetida/ampliada (suma SendGrid para emails transaccionales + chat interno + asistencia IA de redacción) — mismo descarte aplica, no reabrir sin que el usuario lo confirme explícitamente |

## 19. Fuera de alcance de este doc (candidate-side / Ale)

Este backlog es solo del **recruiter**. Estas tarjetas de Trello (JSON board 2026-07-10) son
candidate-side (portal/perfil del candidato) — quedan anotadas acá para no perderlas, pero su
scope real va en la cancha de Ale, no en este documento.

| | Capacidad | Nota |
|---|---|---|
| ❓ | Perfil mínimo y completitud del candidato (campos obligatorios para postularse + % de completitud) | Trello [53]. Candidate-side |
| ❓ | Potenciar perfil del candidato: sección Idiomas, skills por experiencia laboral, logros por experiencia | Trello [56]. Candidate-side, alimenta el Match Score IA (§4/§14) |
| ❓ | Gestión de Candidatos Compartidos / carga recruiter → candidato crea cuenta | Trello [51] — ver detalle abajo, **NO es candidate-side puro, toca la arquitectura de tenancy** |

### [51] Gestión (Inteligente) de Candidatos Compartidos — detalle (2 docs adjuntos leídos 2026-07-10)

> ⚠️ **Esto no es una feature chica — cuestiona un principio de arquitectura del proyecto.**
> `.claude/rules/database.md` dice "Toda tabla de dominio lleva `organization_id`. Sin
> excepción." Lo que piden estos documentos es un **"Talent ID" único por persona, compartido
> entre TODAS las organizations de WeHunter** (perfil global del candidato, igual para
> cualquier recruiter que lo cargue, en cualquier org) — es decir, candidatos dejarían de ser
> 100% aislados por tenant. Hoy `candidates` es una tabla por-organization; si dos recruiters de
> dos orgs distintas cargan a la misma persona, hoy son dos filas sin relación. Esto pide que
> sean **la misma identidad**, con una capa privada por-recruiter encima. Además roza la
> estrategia "recruiter-first, marketplace parkeado" ([[recruiter-first-marketplace-parked]]):
> una identidad de candidato compartida entre orgs es infraestructura de marketplace, aunque
> el documento no lo mencione así.

**Dos versiones del documento** (la 2ª ["Gestión Inteligente..."] es más completa/refinada que
la 1ª ["Documento Funcional..."], parecen ser dos iteraciones de la misma idea):

- **Talent ID** único y permanente por persona (ej. `WH-TAL-00000125`), no cambia nunca.
- **Motor de unificación / Identity Resolution**: antes de crear un candidato, busca
  coincidencias por email/teléfono/LinkedIn (a futuro con IA). Con score de confianza:
  ≥99% unifica automático, 85-98% sugiere coincidencia, <85% crea nuevo. (La 1ª versión no
  tiene scoring, solo "existe / no existe").
- **Tres capas de información**:
  1. **Perfil Global** (dueño: el candidato) — datos personales, CV, experiencia, skills,
     idiomas, remuneración, disponibilidad, LinkedIn, portfolio. Todos los recruiters ven
     siempre la versión más actual.
  2. **Espacio Privado del Recruiter** (dueño: cada recruiter) — notas, feedback, evaluaciones,
     pipeline, cliente, tags, recordatorios. Nunca se comparte ni se modifica automáticamente.
  3. **Snapshot del Proceso** — cada postulación guarda una foto congelada del perfil en ese
     momento (CV, skills, remuneración, respuestas, scores); si el candidato actualiza su
     perfil después, el histórico de ese proceso no cambia.
- **Flujo de carga**: recruiter carga candidato → sistema busca coincidencias → si existe,
  ofrece "Agregar a mi base" (solo crea la relación recruiter↔candidato, no duplica) → si el
  candidato después crea cuenta, se vincula al Talent ID existente (estado "Reclamado").
- **Resolución de conflictos** (solo en la 2ª versión): prioridad de datos = candidato
  actualizado > validado por sistema > cargado por recruiter > histórico. El valor anterior
  queda en el historial. Notas/evaluaciones del recruiter nunca se pisan automáticamente.
- **Scoring de 3 tipos, distintos entre sí**: Talent Score (dinámico, del perfil), Match Score
  (dinámico, por búsqueda), Evaluación del Recruiter (histórica, nunca cambia sola).
- **Notificación al recruiter** cuando el candidato actualiza su perfil, con vista "antes/ahora"
  de los cambios (empresa, skills, CV nuevo, etc.).

**Relación con lo que ya existe hoy:** parcialmente relacionado con `candidates.profileId`
(cuando el candidato tiene cuenta real, ya se linkea y se muestra "Este candidato tiene una
cuenta propia" con link al perfil — commit `968cc64`), pero eso es **dentro de una misma org**.
La identidad global cross-org, el motor de unificación con scoring, el Espacio Privado
formalizado y los snapshots por proceso **no existen** — es un sistema nuevo y grande.

**Cómo aplicar:** no proponer implementación de esto sin que el usuario decida explícitamente
si la tenencia cross-org es un cambio de arquitectura que quiere asumir — es la pieza con mayor
impacto estructural de todo lo relevado en esta reconciliación.

> **Actualizado el 2026-07-13**: §20 (bugs) queda **cerrado**, ver detalle en esa sección. El
> usuario confirmó que **no arranca nada más del backlog de funcionalidades** (§1–§19) hasta
> discutir uno por uno qué implica cada ítem — este doc sigue solo catalogando, sin decisiones
> de scope tomadas todavía sobre las tarjetas de Trello pendientes.

## 20. Bugs reportados en Trello — CERRADO 2026-07-13

> **Actualizado el 2026-07-13**: §7 Google Calendar activo en desarrollo local (credenciales
> cargadas), pendiente que el usuario las cargue en Vercel para producción.
> **Actualizado el 2026-07-13 (segunda parte)**: arreglados los 8 bugs pedidos por el usuario
> (fullName editable, job IA duplicado, los 3 de onboarding con IA del candidato, duplicado de
> aviso, pipeline duplicado, falta botón volver) + 2 más encontrados por captura durante la
> sesión: títulos duplicados en el aviso generado con IA (era el mismo bug que "edición de aviso
> y su vista previa", causa raíz confirmada) y candidato con cuenta vinculada sin poder ver su
> CV/perfil + scoring de IA con datos vacíos (scoring ahora hace fallback de lectura a `profiles`
> cuando `candidates` está vacío, sin duplicar datos — decisión tomada junto con el usuario tras
> descartar un trigger de sincronización por su efecto colateral sobre la ficha del candidato).
> **Con esto, §20 queda cerrado**: no quedan bugs de código sin resolver de las 11 tarjetas
> originales. Detalle técnico completo en el historial de la sesión, no repetido acá.

Bucket separado del backlog de funcionalidades de arriba — son bugs, no alcance nuevo. Listas
FIXES + MEJORAS del board (2026-07-10).

| | Reportado | Estado | Nota |
|---|---|---|---|
| ⚙️ | Supabase no manda el mail de confirmación de registro, bloquea el alta | No es bug de código | Config del Dashboard de Supabase (Auth > Email/SMTP) — nada en el repo lo controla |
| ❌ | Error al registrarse con LinkedIn | No es bug | No existe login social en el código — no está ni implementado ni roto |
| ✅ | El candidato puede editar su email y nombre de registro | **Arreglado 2026-07-13** | Email ya estaba protegido; `fullName` ahora es read-only en `/c/profile` y el server nunca lo persiste en una edición, aunque se tampee el form |
| ✅ | Creación de búsqueda con IA: se duplica el job al crearlo | **Arreglado 2026-07-13** | Guard síncrono + botón deshabilitado mientras `pending` en `JobAiCreateForm.tsx` |
| ✅ | Carga de candidato con IA (CV): datos incompletos (nombre, teléfono) | **Arreglado 2026-07-13** | Prompt + schema de Gemini ahora piden `fullName`/`phone`; se precargan en el paso de revisión |
| ✅ | Carga de candidato con IA: a veces redirige a carga manual | **Arreglado 2026-07-13** | Si Gemini falla de verdad, ahora se avisa explícitamente en vez de caer silencioso a un borrador vacío |
| ✅ | Carga de candidato con IA: pide subir el CV de nuevo | **Arreglado 2026-07-13** | El CV se sube a Storage en el paso 1 (server-side), ya no depende de reinyectar el archivo en memoria del cliente |
| ✅ | Edición de aviso y su vista previa (títulos duplicados, confirmado por captura) | **Arreglado 2026-07-13** | El contenido generado por IA traía su propio encabezado Markdown duplicando el título estático de la sección. Prevención a futuro (prompt + saneamiento al guardar); avisos ya creados se limpian cuando se editen y guarden de nuevo |
| ✅ | Pipeline: candidatos postulados se duplican / aparecen en "nuevo" | **Arreglado 2026-07-13** | Índice único `applications(job_id, candidate_id)` + manejo de conflicto, también en la función SQL del Career Site |
| ✅ | Falta botón "volver atrás" en varias pantallas | **Arreglado 2026-07-13** | Breadcrumb agregado en `/jobs/new`, `/candidates/new`, `/candidates/[id]/edit` + "Cancelar" contextual |
| — | Faltan preguntas de filtro al crear búsqueda (con y sin IA) | No es bug | Es §6 Screening (🔭 Etapa 2), no construido — reclasificado |
| ✅ | *(nuevo, por captura)* Candidato con cuenta vinculada: no se ve su CV/perfil, scoring de IA con datos vacíos | **Arreglado 2026-07-13** | `apply_to_career_site_job` no copiaba bio/skills al vincular; CV agregado a "Ver perfil completo" + política RLS de Storage que faltaba; scoring con fallback de lectura a `profiles` |

**Ownership:** los 3 fixes de onboarding con IA (5a/b/c) y el de `fullName` tocaron
`src/features/candidate/` — cancha de Ale, se hizo por pedido explícito del usuario en esta
sesión, avisar para que lo tenga en cuenta antes de tocar esa zona de nuevo.

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
