import type { OrgRole } from "./session";

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
 */

export type Capability =
  | "jobs.manage"
  | "candidates.manage"
  | "applications.add"
  | "pipeline.move"
  | "interviews.manage"
  | "notes.write"
  | "shortlists.manage"
  | "clients.manage"
  | "requisitions.review"
  | "stages.configure"
  | "offers.manage"
  | "messaging.send"
  | "ai.use";

const ALL: Capability[] = [
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
  "ai.use",
];

/**
 * owner/admin/recruiter conservan exactamente lo que podían antes de existir esta matriz:
 * no se les recorta nada en esta tanda.
 *
 * El consultor externo y el hiring manager quedan sin capacidades operativas a propósito:
 * sus permisos reales dependen de "búsquedas asignadas", que todavía no existe como
 * concepto. Dárselas ahora significaría dejarlos operar sobre TODAS las búsquedas de la
 * organización, que es peor que no dárselas.
 */
const CAPABILITIES: Record<OrgRole, readonly Capability[]> = {
  owner: ALL,
  admin: ALL,
  recruiter: ALL,
  sourcer: ["candidates.manage", "applications.add", "notes.write", "ai.use"],
  consultant: [],
  hiring_manager: [],
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

export const ROLE_LABELS: Record<OrgRole, string> = {
  owner: "Propietario",
  admin: "Administrador",
  recruiter: "Recruiter",
  sourcer: "Sourcer",
  consultant: "Consultor externo",
  hiring_manager: "Cliente / Hiring Manager",
  viewer: "Viewer",
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
