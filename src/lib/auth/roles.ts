import type { OrgRole, WorkspaceType } from "./session";

/**
 * Capacidades por rol, predefinidas y no configurables (decisión de producto: los permisos
 * vienen fijos con el rol, no hay switches por workspace).
 *
 * La autorización primaria sigue viviendo en cada caso de uso; esto centraliza el "quién
 * puede qué" para que agregar un rol sea tocar una tabla y no treinta archivos.
 *
 * OJO: hoy las políticas RLS solo distinguen pertenencia a la organización
 * (`is_org_member`), no rol. Es decir que el solo-lectura del viewer y el alcance acotado
 * del consultor viven en esta capa y NO tienen respaldo en la base. Es deuda conocida y
 * anotada: si un caso de uso se olvida de chequear, Postgres no lo frena.
 *
 * Matriz reescrita 2026-08-04 con la especificación completa que confirmó el cliente
 * (ver "Roles" en docs/BACKLOG.md — es la fuente de verdad textual, no reinterpretar sin
 * volver a leerla). Esta primera pasada cubre el gating de nivel página/nav (qué ve, qué
 * botones aparecen); todavía NO cubre:
 *   - Scoping por "búsqueda asignada" (hoy jobs.view/jobs.manage no filtran qué búsquedas
 *     puntuales ve cada quien — eso vive en las queries, no en esta capa).
 *   - Subtabs dentro de una búsqueda puntual para Sourcer (solo Detalle+Postulados) —
 *     hoy `stages.configure`/`offers.manage`/`shortlists.manage` no están conectados
 *     todavía a botones concretos de esas pantallas, solo a la matriz.
 *
 * La experiencia propia del Hiring Manager (cargar solicitud, feedback de shortlist
 * compartida) se construyó 2026-08-05 — ver `requisitions.create`/`shortlists.feedback`
 * y los helpers `isRequesterScoped`/`isEnterpriseAssignedScoped`/`canReviewRequisitions`
 * más abajo.
 */

export type Capability =
  | "jobs.view"
  | "jobs.manage"
  | "candidates.manage"
  | "applications.add"
  | "pipeline.move"
  | "interviews.manage"
  | "notes.write"
  | "shortlists.manage"
  | "clients.manage"
  | "requisitions.review"
  | "requisitions.create"
  | "shortlists.feedback"
  | "stages.configure"
  | "settings.stages_template"
  | "offers.manage"
  | "messaging.send"
  | "sourcing.use"
  | "reports.view"
  | "career_site.manage"
  | "team.manage"
  | "billing.view"
  | "community.appear"
  | "integrations.connect"
  | "ai.use";

const ALL: Capability[] = [
  "jobs.view",
  "jobs.manage",
  "candidates.manage",
  "applications.add",
  "pipeline.move",
  "interviews.manage",
  "notes.write",
  "shortlists.manage",
  "clients.manage",
  "requisitions.review",
  "requisitions.create",
  "shortlists.feedback",
  "stages.configure",
  "settings.stages_template",
  "offers.manage",
  "messaging.send",
  "sourcing.use",
  "reports.view",
  "career_site.manage",
  "team.manage",
  "billing.view",
  "community.appear",
  "integrations.connect",
  "ai.use",
];

const CAPABILITIES: Record<OrgRole, readonly Capability[]> = {
  owner: ALL,
  admin: ALL,

  // Ve todas las páginas, pero no administra Equipo/Career Site/facturación, y su
  // Configuración queda acotada a su propio perfil (sin plantilla de etapas ni workspace).
  recruiter: [
    "jobs.view",
    "jobs.manage",
    "candidates.manage",
    "applications.add",
    "pipeline.move",
    "interviews.manage",
    "notes.write",
    "shortlists.manage",
    "clients.manage",
    "requisitions.review",
    "stages.configure",
    "offers.manage",
    "messaging.send",
    "sourcing.use",
    "reports.view",
    "community.appear",
    "integrations.connect",
    "ai.use",
  ],

  // Búsquedas asignadas, Sourcing y Candidatos (con carga), Reportes y Mensajes. Nada de
  // pipeline/etapas/ofertas/shortlist/aviso, nada de Agenda, Career Site, Equipo, Plan y
  // Facturación, integraciones ni comunidad.
  sourcer: [
    "jobs.view",
    "candidates.manage",
    "applications.add",
    "notes.write",
    "sourcing.use",
    "reports.view",
    "messaging.send",
    "ai.use",
  ],

  // Búsquedas asignadas, Candidatos, Sourcing, Mensajes y Agenda (con conexión de
  // calendario propia). No crea búsquedas, no ve Reportes/Solicitudes/Clientes.
  consultant: [
    "jobs.view",
    "candidates.manage",
    "sourcing.use",
    "messaging.send",
    "interviews.manage",
    "integrations.connect",
    "community.appear",
    "ai.use",
  ],

  // Carga solicitudes, da feedback de shortlist compartida, ve y opera Agenda y Sourcing,
  // ve Búsquedas y Candidatos. Único rol (además de owner/admin) con acceso a la plantilla
  // de etapas en Configuración. Sin Equipo, Career Site, Plan y Facturación ni comunidad.
  // `requisitions.review` acá NO habilita aprobar/rechazar (ver `canReviewRequisitions`):
  // el HM "carga, no revisa" — la capability solo gatea que vea la pantalla de Solicitudes,
  // acotada a las suyas. `requisitions.create` es la que de verdad le pertenece solo a él.
  hiring_manager: [
    "jobs.view",
    "candidates.manage",
    "interviews.manage",
    "sourcing.use",
    "requisitions.review",
    "requisitions.create",
    "shortlists.feedback",
    "settings.stages_template",
    "ai.use",
  ],

  // Sin especificar por el cliente todavía (ver docs/BACKLOG.md) — se mantiene solo-lectura.
  viewer: [],
};

export function can(role: OrgRole, capability: Capability): boolean {
  return CAPABILITIES[role].includes(capability);
}

/** Roles que operan el reclutamiento de punta a punta. Se mantiene por compatibilidad con
 *  los llamados que no necesitan una capacidad puntual. */
export function canManageRecruiting(role: OrgRole): boolean {
  return can(role, "jobs.manage");
}

/** Un rol sin ninguna capacidad solo mira: sirve para mensajes de error y para esconder
 *  acciones en la UI. */
export function isReadOnly(role: OrgRole): boolean {
  return CAPABILITIES[role].length === 0;
}

/**
 * Roles cuya visibilidad de búsquedas queda acotada a las que tiene asignadas — como
 * responsable (`jobs.assigned_to`) o como sourcer (`jobs.sourcer_id`), ver docs/BACKLOG.md
 * puntos 3/4/5 de la especificación 2026-08-04 ("solo veo lo que me asignan a mí").
 *
 * `hiring_manager` queda fuera a propósito: ni `RESPONSABLE_ROLES` ni el campo sourcer lo
 * contemplan hoy (`gestionar-responsables.ts`) — su scoping real depende de una relación
 * búsqueda↔HM que todavía no existe en el modelo (ver checklist de BACKLOG.md). Hasta que
 * se construya, sigue viendo todas las búsquedas de la org como owner/admin (mejor eso que
 * una lista vacía que contradice "puede ver todo" de su especificación).
 */
export function isAssignmentScoped(role: OrgRole): boolean {
  return role === "recruiter" || role === "sourcer" || role === "consultant";
}

/**
 * Recruiter en workspace TEAM ve, en Solicitudes, solo las del cliente que le asignaron
 * (`memberships.assignedClientId`) — ver docs/BACKLOG.md punto 4 de la especificación
 * 2026-08-04. No aplica a Enterprise: ahí el scoping depende de qué recruiter eligió el
 * Hiring Manager al crear la solicitud (campo todavía no existe, ver checklist de roles).
 * No aplica a Freelance: ese plan no admite más miembros que el propietario, no hay rol
 * recruiter posible ahí.
 */
export function isClientScoped(role: OrgRole, workspaceType: WorkspaceType | null): boolean {
  return role === "recruiter" && workspaceType === "team";
}

/**
 * Recruiter en workspace ENTERPRISE ve, en Solicitudes, solo las que le asignó un Hiring
 * Manager (`requisitions.assignedToMembershipId`) — contraparte de `isClientScoped` para
 * Team. Cierra el punto pendiente de la especificación 2026-08-04 ("el HM elige un
 * recruiter al crear la solicitud").
 */
export function isEnterpriseAssignedScoped(
  role: OrgRole,
  workspaceType: WorkspaceType | null,
): boolean {
  return role === "recruiter" && workspaceType === "enterprise";
}

/** El HM ve /requisitions acotado a las que ÉL cargó (`requisitions.createdByProfileId`) —
 *  "ve solicitudes, pero como si cargara", no una bandeja de revisión. */
export function isRequesterScoped(role: OrgRole): boolean {
  return role === "hiring_manager";
}

/**
 * Quién puede de verdad aprobar/rechazar una solicitud — distinto de `can(role,
 * "requisitions.review")`, que el HM también tiene (esa capability solo gatea que VEA la
 * pantalla). El HM nunca revisa, ni siquiera la suya propia: la revisa el recruiter que él
 * mismo eligió al cargarla. Se chequea acá Y dentro de aprobar/rechazar-requisition.ts
 * (defensa en profundidad, no solo la UI).
 */
export function canReviewRequisitions(role: OrgRole): boolean {
  return can(role, "requisitions.review") && role !== "hiring_manager";
}

export const ROLE_LABELS: Record<OrgRole, string> = {
  owner: "Propietario",
  admin: "Administrador",
  recruiter: "Recruiter",
  sourcer: "Sourcer",
  consultant: "Consultor externo",
  hiring_manager: "Hiring Manager",
  viewer: "Viewer",
};

/** Variante visual de Badge por rol — compartida entre el equipo y el selector de workspace. */
export const ROLE_BADGE: Record<OrgRole, "primary" | "blue" | "muted"> = {
  owner: "primary",
  admin: "blue",
  recruiter: "muted",
  sourcer: "muted",
  consultant: "muted",
  hiring_manager: "muted",
  viewer: "muted",
};

export const ROLE_DESCRIPTIONS: Record<OrgRole, string> = {
  owner: "Dueño de la cuenta. Acceso total, no se puede quitar.",
  admin: "Administra el workspace, el equipo y toda la operación.",
  recruiter: "Gestiona búsquedas y procesos de selección completos.",
  sourcer: "Carga y propone candidatos. No crea ni publica búsquedas.",
  consultant: "Colabora en búsquedas puntuales, sin ver el resto de la información.",
  hiring_manager: "Participa de las decisiones sobre los candidatos que le comparten.",
  viewer: "Solo consulta: ve procesos y reportes, no interviene.",
};
