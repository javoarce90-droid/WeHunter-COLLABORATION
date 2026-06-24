# Backlog atómico — Recruiter

Inventario atómico de **todo lo que puede hacer el reclutador**, reconciliado entre tres fuentes:
la **demo previa** (`wehunterats`, lo que la UI exponía), los **docs de requerimientos** de esa demo
(scope v1 vs Etapa 2), y **lo que WeHunter ya implementa hoy**.

> Objetivo: tener las piezas atómicas aisladas. Conectar los flujos entre sí es un paso posterior.
> Scope/rol = fuente de verdad el flujo de usuarios (ver `DATA_MODEL.md`). Acá NO se decide scope:
> se cataloga y se marca. **El marketplace de recruiters queda parkeado** (fuera de v1).

## Leyenda

- ✅ **Hecho** — caso de uso ya implementado en `src/features/recruiter/`.
- 🔲 **Falta (v1)** — en alcance operativo del recruiter, todavía no construido.
- 🔭 **Etapa 2 / IA / diferido** — la demo lo mostraba pero los docs lo marcan fuera de v1
  (IA generativa, integraciones reales, multiposting, marketplace, scraping, CRM avanzado).
- 🧱 **Falta modelo** — requiere tabla/columna nueva en `src/db/schema/` (zona compartida → coordinar).

---

## 1. Workspace / Onboarding  (`organizations` + `memberships`, "freelance = org de 1")

| | Capacidad | Nota |
|---|---|---|
| ✅ | Crear organización al registrarse (org de 1, owner) | `crearOrganization` |
| 🔲 | Editar datos del workspace (nombre, logo, preferencias) | 🧱 logo/preferences |
| 🔲 | Ver/editar perfil personal del recruiter | 🧱 campos en `profiles` |
| 🔲 | Cambiar contraseña | vía Supabase Auth |
| 🔭 | Invitar miembros al equipo + asignar rol (admin/recruiter) | 🧱 invitations; UI equipo |
| 🔭 | Activar/desactivar miembro; reenviar invitación | 🧱 `memberships.status` |
| 🔭 | Checklist de activación / tour / bonus IA | REQ-08, Etapa 2 |

## 2. Búsquedas (`jobs`)

| | Capacidad | Nota |
|---|---|---|
| ✅ | Crear búsqueda | `crearBusqueda` |
| ✅ | Editar búsqueda | `editarBusqueda` |
| ✅ | Cambiar estado (draft / open / paused / closed) | `cambiarEstadoBusqueda` |
| 🔲 | Ver listado de búsquedas con filtros (estado, cliente, recruiter, texto) | UI listado |
| 🔲 | Ver detalle / workspace de una búsqueda (tabs) | UI |
| 🔲 | Campos ricos: ubicación, modalidad, seniority, salario, skills, prioridad, deadline, tipo contratación | 🧱 columnas en `jobs` |
| 🔲 | Vincular búsqueda a un cliente | 🧱 ver §11 |
| 🔭 | Duplicar búsqueda | |
| 🔭 | Archivar búsqueda (estado extra) | 🧱 enum `job_status` |
| 🔭 | Asignar equipo a la búsqueda (owner/recruiter/consultor) | 🧱 `job_assignments` |
| 🔭 | Importar búsquedas por CSV / Google Sheets | |

## 3. Publicación / Aviso

| | Capacidad | Nota |
|---|---|---|
| 🔲 | Redactar y editar el texto del aviso público | 🧱 |
| 🔲 | Preview del aviso antes de publicar | |
| 🔭 | Publicar en portal público / careers / link público | |
| 🔭 | Multiposting (LinkedIn, bolsas) | Etapa 2 |
| 🔭 | Métricas de publicación (vistas, postulaciones, origen) | Etapa 2, ver §12 |

## 4. Candidatos / Talento (`candidates`)

| | Capacidad | Nota |
|---|---|---|
| ✅ | Cargar candidato (manual, `profile_id = null`) | `cargarCandidato` |
| ✅ | Editar candidato | `editarCandidato` |
| ✅ | Subir CV (bucket privado `cvs`) | ya soportado (`cv_url`) |
| 🔲 | Listado de talento unificado con filtros por estado operativo | UI |
| 🔲 | Ver ficha de candidato (CV, experiencia, skills, etc.) | 🧱 campos enriquecidos |
| 🔲 | Marcar fuente del candidato (LinkedIn, referido, manual…) | 🧱 `candidates.source` |
| 🔭 | Detectar y mergear duplicados (por email/LinkedIn) | 🧱 |
| 🔭 | Pool pasivo / contactado / archivado (estados de talento) | 🧱 |
| 🔭 | Mini-bio IA, scoring IA, fortalezas/red flags | Etapa 2 / IA |
| 🔭 | Consentimiento (`consentAcceptedAt`) y derecho a borrado (GDPR-lite) | 🧱 v1 legal mínimo |

## 5. Pipeline / Etapas (`applications`)

| | Capacidad | Nota |
|---|---|---|
| ✅ | Postular candidato a una búsqueda (entra al pipeline) | `postularCandidato` |
| ✅ | Mover candidato de etapa (transiciones validadas) | `moverEtapa`, `isValidTransition` |
| 🔲 | Ver pipeline / Kanban por búsqueda | UI |
| 🔲 | Ver score/compatibilidad y badges en las cards | depende de §IA |
| 🔭 | Etapas configurables (crear/renombrar/reordenar/eliminar) | hoy enum fijo → 🧱 tabla `pipeline_stages` |
| 🔭 | Plantillas de pipeline | Etapa 2 |
| 🔭 | SLA por etapa + badges verde/amarillo/rojo + filtro en riesgo | 🧱 Etapa 2 |
| 🔭 | Automatizaciones al mover etapa (email/notif) | Etapa 2 |
| 🔲 | Ver historial de movimientos de etapa | 🧱 `application_events` |

## 6. Screening

| | Capacidad | Nota |
|---|---|---|
| 🔭 | Definir preguntas de screening por búsqueda (tipos: sí/no, texto, numérica, opción) | 🧱 `screening_questions` |
| 🔭 | Ver respuestas de screening del candidato | 🧱 |
| 🔭 | Screening automático con IA | Etapa 2 / IA |

## 7. Entrevistas (`interviews`)

| | Capacidad | Nota |
|---|---|---|
| ✅ | Agendar entrevista (fecha, modalidad, lugar/link, notas) | `agendarEntrevista` |
| ✅ | Editar entrevista | `actualizarEntrevista` |
| ✅ | Eliminar/cancelar entrevista | `eliminarEntrevista` |
| ✅ | Listar / agenda de entrevistas | `/agenda` — vista org-wide, próximas por día + pasadas |
| 🔭 | Tipo de entrevista (screening/técnica/comportamental/cliente) | 🧱 columna |
| 🔭 | Guía de entrevista con preguntas IA; informe post-entrevista | Etapa 2 / IA |
| 🔭 | Integración Google Calendar; grabación | Etapa 2 |

## 8. Notas / Comunicación

| | Capacidad | Nota |
|---|---|---|
| ✅ | Guardar nota interna sobre la postulación | `guardarNota` (`applications.notes`) |
| 🔲 | Timeline de notas (varias por candidato) | hoy es campo único → 🧱 `notes` tabla |
| 🔭 | Mensajería a candidato (email / WhatsApp / LinkedIn) | Etapa 2 (WhatsApp v1.1) |
| 🔭 | Inbox de hilos Gmail/Outlook | Etapa 2 |
| 🔭 | Generar outreach con IA (canal + tono) | Etapa 2 / IA |

## 9. Shortlists / Sharing  (`shortlists`, `shortlist_shares`, `shortlist_feedback`)

| | Capacidad | Nota |
|---|---|---|
| ✅ | Crear shortlist de una búsqueda | `crearShortlist` |
| ✅ | Generar magic link para el cliente | `generarShare` |
| ✅ | Revocar link | `revocarShare` |
| ✅ | (Empresa) revisar shortlist por token y dejar feedback | `company/shortlist-review` |
| 🔲 | Marcar candidato como shortlist/favorito desde el pipeline | flujo de armado |
| 🔭 | Control fino de campos compartidos (qué ve el cliente) | 🧱 |
| 🔲 | Ver feedback del cliente reflejado del lado recruiter | lectura de `shortlist_feedback` |

## 10. Ofertas / Cierre

| | Capacidad | Nota |
|---|---|---|
| 🔭 | Generar oferta (cargo, salario, beneficios, fecha inicio) | 🧱 `offers` |
| 🔭 | Estados de oferta (draft/enviada/negociación/aceptada/rechazada) | 🧱 |
| 🔭 | PDF de la oferta; enviar por email | Etapa 2 |
| 🔲 | Cerrar búsqueda por oferta aceptada (atajo a `closed` + `hired`) | sobre lo ya hecho |

## 11. Clientes / CRM mínimo

| | Capacidad | Nota |
|---|---|---|
| 🔲 | CRUD de empresas cliente (nombre mínimo) | 🧱 `clients` |
| 🔲 | Vincular cliente ↔ búsqueda; ver búsquedas por cliente | 🧱 FK en `jobs` |
| 🔭 | Contactos del cliente, CRM completo | v1.1 / v2 |

## 12. Reportes / Analytics

| | Capacidad | Nota |
|---|---|---|
| ✅ | KPIs de dashboard (1 query) | `obtenerKpis` |
| 🔲 | Funnel de conversión por etapa | lectura agregada |
| 🔲 | Time-to-stage / time-to-hire | requiere §5 historial |
| 🔭 | Calidad por fuente; rendimiento por recruiter; SLA compliance | Etapa 2 |
| 🔭 | Export CSV / PDF; enviar reporte a cliente | Etapa 2 |

## 13. Configuración

| | Capacidad | Nota |
|---|---|---|
| 🔲 | Perfil, idioma, zona horaria, firma de email | 🧱 |
| 🔭 | Plan / consumo / upgrade | facturación = diferido |
| 🔭 | Notificaciones (email/push/slack) | Etapa 2 |
| 🔭 | Integraciones (LinkedIn, Gmail, WhatsApp, Calendar, API) | Etapa 2 |

## 14. Suite IA  (todo Etapa 2)

🔭 Generar/mejorar/analizar JD · screening con IA · scoring de CV · mini-bio · query booleana de sourcing ·
mensajes outreach · guía de entrevista · "Hunti" copiloto contextual · agentes IA modal · límites/quota mensual.

## 15. Sourcing / Scraping  (diferido)

🔭 Asistente booleano LinkedIn · abrir en LinkedIn · pegar URLs / bandeja de revisión · importar a talento ·
scraping multi-plataforma · exportar CSV.

## 16. Equipo / Roles avanzados  (Etapa 2)

🔭 `job_assignments` (asignar recruiters/consultores por búsqueda) · consultor externo con acceso acotado ·
gestión de roles (admin solo) · auditoría.

---

## Resumen del gap

- **Hecho (núcleo operativo):** crear/editar/estado de búsquedas · cargar/editar candidatos + CV ·
  postular + mover etapa · entrevistas CRUD · nota interna · shortlists + share + feedback empresa · KPIs.
- **Falta v1 (mayormente UI sobre dominio existente + algún campo):** listados con filtros, ficha de
  candidato, Kanban, aviso/publicación básica, vincular cliente, cerrar por oferta, reportes de funnel,
  configuración de perfil.
- **Falta v1 con modelo nuevo (🧱, zona compartida):** campos ricos en `jobs`, `clients`, `notes` como
  tabla, historial de etapas, fuente de candidato, legal mínimo (consentimiento/borrado).
- **Etapa 2 / IA / diferido:** toda la suite IA, sourcing/scraping, ofertas, screening, SLA/automatizaciones,
  integraciones, mensajería, equipo/asignaciones, marketplace (parkeado).
