import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  date,
  pgEnum,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/**
 * Schema base de WeHunter. Implementa docs/DATA_MODEL.md.
 *
 * Convenciones (ver .claude/rules/database.md):
 *  - snake_case en inglés.
 *  - Toda tabla de dominio lleva organization_id, id (uuid), created_at, updated_at.
 *  - RLS de respaldo: las políticas se definen junto a la tabla.
 *
 * NOTA: este archivo es el punto de partida. Faltan tablas (interviews, shortlists, etc.)
 * que se agregan a medida que cada feature las necesita. Coordinar cambios: collaboration.md
 */

// Helpers de columnas comunes
const timestamps = {
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
};

// ---- Enums ----
export const orgRole = pgEnum("org_role", [
  "owner",
  "admin",
  "recruiter",
  "consultant",
]);

export const jobStatus = pgEnum("job_status", [
  "draft",
  "open",
  "paused",
  "closed",
]);

// Etapas del pipeline: FIJAS por ahora (no configurables por organization).
// Si más adelante se necesitan configurables, se migra a una tabla.
export const applicationStage = pgEnum("application_stage", [
  "new",
  "screening",
  "interview",
  "offer",
  "hired",
  "rejected",
]);

// Decisión de la empresa sobre un candidato compartido en un shortlist.
export const feedbackDecision = pgEnum("feedback_decision", [
  "approved",
  "rejected",
  "maybe",
]);

// Modalidad de una entrevista agendada.
export const interviewMode = pgEnum("interview_mode", [
  "onsite", // presencial
  "remote", // videollamada
  "phone", // telefónica
]);

// Estado de una entrevista en su ciclo de vida.
export const interviewStatus = pgEnum("interview_status", [
  "scheduled", // agendada (futura)
  "completed", // realizada
  "cancelled", // cancelada
]);

// Campos ricos de una búsqueda (paridad demo). Todos opcionales en la columna.
export const jobModality = pgEnum("job_modality", ["onsite", "remote", "hybrid"]);
export const jobSeniority = pgEnum("job_seniority", [
  "junior",
  "semisenior",
  "senior",
  "lead",
]);
export const jobPriority = pgEnum("job_priority", ["low", "medium", "high"]);
export const employmentType = pgEnum("employment_type", [
  "full_time",
  "part_time",
  "contract",
  "internship",
  "temporary",
]);

// De dónde salió el candidato. Trazabilidad de fuente del pool.
export const candidateSource = pgEnum("candidate_source", [
  "manual",
  "linkedin",
  "referral",
  "job_board",
  "other",
]);

// ---- Tenancy ----

// El tenant. Todo dato de dominio cuelga de acá.
export const organizations = pgTable("organizations", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  ...timestamps,
}, (t) => ({
  slugIdx: uniqueIndex("organizations_slug_idx").on(t.slug),
}));

// Usuario de la app. Espeja auth.users de Supabase (id = auth.users.id).
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(), // = auth.users.id
  email: text("email").notNull(),
  fullName: text("full_name"),
  cvUrl: text("cv_url"), // path en Supabase Storage para candidatos
  ...timestamps,
});

// Vincula un profile con una organization y le da un rol.
export const memberships = pgTable("memberships", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  profileId: uuid("profile_id")
    .references(() => profiles.id, { onDelete: "cascade" })
    .notNull(),
  role: orgRole("role").notNull().default("recruiter"),
  ...timestamps,
}, (t) => ({
  uniqueMember: uniqueIndex("memberships_org_profile_idx").on(
    t.organizationId,
    t.profileId,
  ),
  orgIdx: index("memberships_org_idx").on(t.organizationId),
}));

// ---- Reclutamiento (núcleo) ----

// Empresa cliente de la consultora. CRM mínimo: una búsqueda puede vincularse a un cliente.
export const clients = pgTable("clients", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  contactName: text("contact_name"),
  contactEmail: text("contact_email"),
  notes: text("notes"),
  createdBy: uuid("created_by").references(() => profiles.id),
  ...timestamps,
}, (t) => ({
  orgIdx: index("clients_org_idx").on(t.organizationId),
}));

// Búsqueda / aviso.
export const jobs = pgTable("jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  // Cliente para el que es la búsqueda (CRM mínimo). null = búsqueda interna / sin cliente.
  clientId: uuid("client_id").references(() => clients.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  description: text("description"), // brief interno
  // Texto del aviso público (separado del brief interno). Se redacta y previsualiza.
  posting: text("posting"),
  status: jobStatus("status").notNull().default("draft"),
  // Campos ricos (paridad demo). Todos opcionales para no romper filas existentes.
  location: text("location"),
  modality: jobModality("modality"),
  seniority: jobSeniority("seniority"),
  employmentType: employmentType("employment_type"),
  salaryMin: integer("salary_min"),
  salaryMax: integer("salary_max"),
  salaryCurrency: text("salary_currency"),
  skills: text("skills").array(),
  priority: jobPriority("priority"),
  deadline: date("deadline"),
  createdBy: uuid("created_by").references(() => profiles.id),
  ...timestamps,
}, (t) => ({
  orgIdx: index("jobs_org_idx").on(t.organizationId),
  clientIdx: index("jobs_client_idx").on(t.clientId),
}));

// Candidato en el pool del reclutador.
// profileId es OPCIONAL: null = candidato cargado a mano por el recruiter (no es usuario
// de la app todavía). Cuando la persona se registra en el portal y acepta la invitación,
// se enlaza acá. Ver caso de uso "invitar candidato a registrarse" en DATA_MODEL.md.
export const candidates = pgTable("candidates", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  profileId: uuid("profile_id").references(() => profiles.id, {
    onDelete: "set null",
  }), // null hasta que el candidato se registra y se vincula
  fullName: text("full_name").notNull(),
  email: text("email"),
  cvUrl: text("cv_url"), // path en Supabase Storage
  // Campos enriquecidos de la ficha (paridad demo). Todos opcionales.
  headline: text("headline"), // puesto/título actual, ej "Frontend Senior @ Acme"
  location: text("location"),
  linkedinUrl: text("linkedin_url"),
  summary: text("summary"), // experiencia / bio en texto libre
  skills: text("skills").array(),
  source: candidateSource("source"),
  // Consentimiento de tratamiento de datos (GDPR-lite). null = no registrado.
  consentAcceptedAt: timestamp("consent_accepted_at"),
  ...timestamps,
}, (t) => ({
  orgIdx: index("candidates_org_idx").on(t.organizationId),
  profileIdx: index("candidates_profile_idx").on(t.profileId),
}));

// Postulación: un candidato dentro del pipeline de un job.
export const applications = pgTable("applications", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  jobId: uuid("job_id")
    .references(() => jobs.id, { onDelete: "cascade" })
    .notNull(),
  candidateId: uuid("candidate_id")
    .references(() => candidates.id, { onDelete: "cascade" })
    .notNull(),
  stage: applicationStage("stage").notNull().default("new"),
  // Nota interna del reclutador sobre el candidato en este proceso. No visible para la empresa.
  notes: text("notes"),
  ...timestamps,
}, (t) => ({
  orgIdx: index("applications_org_idx").on(t.organizationId),
  jobIdx: index("applications_job_idx").on(t.jobId),
  // Acceso "búsquedas de un candidato" (ficha de candidato): filtra por candidate_id.
  candidateIdx: index("applications_candidate_idx").on(t.candidateId),
}));

// Entrevista agendada sobre una postulación. Es interna del equipo reclutador:
// no se expone a la empresa por el share. Una application puede tener N entrevistas.
export const interviews = pgTable("interviews", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  applicationId: uuid("application_id")
    .references(() => applications.id, { onDelete: "cascade" })
    .notNull(),
  scheduledAt: timestamp("scheduled_at").notNull(),
  mode: interviewMode("mode").notNull().default("remote"),
  // Lugar (dirección) o link de la videollamada según la modalidad. Opcional.
  location: text("location"),
  // Notas internas de la entrevista (agenda, feedback). No visible para la empresa.
  notes: text("notes"),
  status: interviewStatus("status").notNull().default("scheduled"),
  createdBy: uuid("created_by").references(() => profiles.id),
  ...timestamps,
}, (t) => ({
  orgIdx: index("interviews_org_idx").on(t.organizationId),
  applicationIdx: index("interviews_application_idx").on(t.applicationId),
  // Agenda: lista org-wide ordenada por fecha.
  orgScheduledIdx: index("interviews_org_scheduled_idx").on(
    t.organizationId,
    t.scheduledAt,
  ),
}));

// Nota interna sobre una postulación, como timeline (varias por application).
// Reemplaza al campo único applications.notes (que se mantiene por compatibilidad).
export const notes = pgTable("notes", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  applicationId: uuid("application_id")
    .references(() => applications.id, { onDelete: "cascade" })
    .notNull(),
  body: text("body").notNull(),
  createdBy: uuid("created_by").references(() => profiles.id),
  ...timestamps,
}, (t) => ({
  orgIdx: index("notes_org_idx").on(t.organizationId),
  applicationIdx: index("notes_application_idx").on(t.applicationId),
}));

// Historial de cambios de etapa de una postulación (append-only). Habilita métricas de
// funnel y time-to-stage / time-to-hire (§5/§12 del backlog).
export const applicationEvents = pgTable("application_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  applicationId: uuid("application_id")
    .references(() => applications.id, { onDelete: "cascade" })
    .notNull(),
  fromStage: applicationStage("from_stage"), // null = evento de creación (postulación)
  toStage: applicationStage("to_stage").notNull(),
  changedBy: uuid("changed_by").references(() => profiles.id),
  ...timestamps,
}, (t) => ({
  orgIdx: index("application_events_org_idx").on(t.organizationId),
  applicationIdx: index("application_events_application_idx").on(t.applicationId),
}));

// ---- Shortlists (compartir candidatos con la empresa) ----

// Una selección de candidatos de un job que el reclutador comparte con una empresa.
export const shortlists = pgTable("shortlists", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  jobId: uuid("job_id")
    .references(() => jobs.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  createdBy: uuid("created_by").references(() => profiles.id),
  ...timestamps,
}, (t) => ({
  orgIdx: index("shortlists_org_idx").on(t.organizationId),
  jobIdx: index("shortlists_job_idx").on(t.jobId),
}));

// Candidato puntual dentro de un shortlist. Apunta a una application (job + candidato +
// etapa) para poder exponer la etapa a la empresa sin recalcular nada.
export const shortlistCandidates = pgTable("shortlist_candidates", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  shortlistId: uuid("shortlist_id")
    .references(() => shortlists.id, { onDelete: "cascade" })
    .notNull(),
  applicationId: uuid("application_id")
    .references(() => applications.id, { onDelete: "cascade" })
    .notNull(),
  ...timestamps,
}, (t) => ({
  orgIdx: index("shortlist_candidates_org_idx").on(t.organizationId),
  shortlistIdx: index("shortlist_candidates_shortlist_idx").on(t.shortlistId),
  uniquePair: uniqueIndex("shortlist_candidates_unique").on(
    t.shortlistId,
    t.applicationId,
  ),
}));

// Token de acceso para que la empresa revise un shortlist sin tener cuenta.
// El acceso real se sirve por funciones SECURITY DEFINER que validan el token (ver migración).
export const shortlistShares = pgTable("shortlist_shares", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  shortlistId: uuid("shortlist_id")
    .references(() => shortlists.id, { onDelete: "cascade" })
    .notNull(),
  token: text("token").notNull(),
  expiresAt: timestamp("expires_at"), // null = sin vencimiento
  revokedAt: timestamp("revoked_at"), // null = activo
  createdBy: uuid("created_by").references(() => profiles.id),
  ...timestamps,
}, (t) => ({
  orgIdx: index("shortlist_shares_org_idx").on(t.organizationId),
  tokenIdx: uniqueIndex("shortlist_shares_token_idx").on(t.token),
}));

// Feedback de la empresa sobre un candidato del shortlist. Una decisión por candidato
// (la función definer hace upsert). shareId registra por qué token entró la empresa.
export const shortlistFeedback = pgTable("shortlist_feedback", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  shortlistCandidateId: uuid("shortlist_candidate_id")
    .references(() => shortlistCandidates.id, { onDelete: "cascade" })
    .notNull(),
  shareId: uuid("share_id").references(() => shortlistShares.id, {
    onDelete: "set null",
  }),
  decision: feedbackDecision("decision").notNull(),
  comment: text("comment"),
  ...timestamps,
}, (t) => ({
  orgIdx: index("shortlist_feedback_org_idx").on(t.organizationId),
  uniqueCandidate: uniqueIndex("shortlist_feedback_candidate_idx").on(
    t.shortlistCandidateId,
  ),
}));

// Tipos inferidos (fuente de verdad de los tipos de datos)
export type Organization = typeof organizations.$inferSelect;
export type Profile = typeof profiles.$inferSelect;
export type Client = typeof clients.$inferSelect;
export type Job = typeof jobs.$inferSelect;
export type Candidate = typeof candidates.$inferSelect;
export type Application = typeof applications.$inferSelect;
export type Interview = typeof interviews.$inferSelect;
export type Note = typeof notes.$inferSelect;
export type ApplicationEvent = typeof applicationEvents.$inferSelect;
export type Shortlist = typeof shortlists.$inferSelect;
export type ShortlistCandidate = typeof shortlistCandidates.$inferSelect;
export type ShortlistShare = typeof shortlistShares.$inferSelect;
export type ShortlistFeedback = typeof shortlistFeedback.$inferSelect;

/**
 * RLS — política base de aislamiento por tenant.
 *
 * Las políticas finas se afinan por tabla, pero el principio es uno:
 * un usuario solo accede a filas cuya organization_id esté entre sus memberships.
 *
 * Ejemplo de política (se genera como SQL en la migración):
 *
 *   alter table jobs enable row level security;
 *   create policy "tenant_isolation" on jobs
 *     using (
 *       organization_id in (
 *         select organization_id from memberships
 *         where profile_id = auth.uid()
 *       )
 *     );
 *
 * Drizzle soporta definir esto en el schema (pgPolicy). Ver docs/DATA_MODEL.md para
 * el caso especial de candidatos (solo sus propias applications) y empresas (token).
 *
 * IMPLEMENTADO en la migración custom `0001_recruiter_auth_foundation.sql`:
 *  - helper `public.is_org_member(uuid)` (SECURITY DEFINER, no recursivo),
 *  - políticas `tenant_isolation` en jobs/candidates/applications,
 *  - trigger `handle_new_user` (sync profiles) y `create_organization_with_owner`.
 * Estos objetos son SQL custom: no se reflejan en este schema TS pero persisten.
 */
export const RLS_TENANT_ISOLATION = sql``; // marcador histórico; políticas reales en 0001
