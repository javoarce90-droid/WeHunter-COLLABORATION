import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  date,
  boolean,
  jsonb,
  pgEnum,
  uniqueIndex,
  index,
  check,
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
  "sourcer",
  "viewer",
  "hiring_manager",
]);

// Cómo usa WeHunter la organización. Se elige en el onboarding; null = organizaciones
// creadas antes de que existiera el paso.
export const workspaceType = pgEnum("workspace_type", [
  "freelance",
  "team",
  "enterprise",
]);

export const jobStatus = pgEnum("job_status", [
  "draft",
  "open",
  "paused",
  "closed",
  "archived",
]);

// Etapas del pipeline. El enum es la identidad canónica (no cambia por org).
// La tabla pipeline_stages permite override de label, is_active y sla_days por org.
export const applicationStage = pgEnum("application_stage", [
  "new",
  "screening",
  "interview",
  "interview_hr",
  "interview_tech",
  "interview_client",
  "offer",
  "hired",
  "rejected",
]);

// Motivo de descarte de una postulación. Lista fija (no configurable por org).
export const rejectionReason = pgEnum("rejection_reason", [
  "perfil_no_ajusta",
  "pretension_salarial",
  "proceso_avanzado_otro_candidato",
  "no_disponibilidad",
  "otro",
]);

// Tipo de pregunta de screening (§6 backlog). Fijo, no configurable por org.
export const screeningQuestionType = pgEnum("screening_question_type", [
  "yes_no",
  "text",
  "number",
  "multiple_choice",
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

// Tipo/propósito de una entrevista dentro del proceso (distinto de `mode`, que es la
// modalidad presencial/remoto/telefónica).
export const interviewType = pgEnum("interview_type", [
  "screening", // primer filtro, con el recruiter
  "technical", // técnica
  "behavioral", // comportamental / cultural fit
  "client", // con la empresa cliente
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
  "freelance",
]);
// Área/sector de la búsqueda. Catálogo cerrado para consistencia y filtrado.
export const jobArea = pgEnum("job_area", [
  "tecnologia",
  "salud",
  "finanzas",
  "ventas",
  "marketing",
  "rrhh",
  "operaciones",
  "legal",
  "educacion",
  "ingenieria",
  "diseno",
  "atencion_cliente",
  "otro",
]);

// Solicitud de búsqueda (Hiring Request, §17 backlog). Pendiente → aprobada (genera un `job`
// vinculado, no lo reemplaza) / rechazada.
export const requisitionStatus = pgEnum("requisition_status", ["pending", "approved", "rejected"]);

// Motivo de la solicitud: crear un puesto nuevo, o cubrir uno que quedó vacante.
export const requisitionReason = pgEnum("requisition_reason", ["new_position", "backfill"]);

// De dónde salió el candidato. Trazabilidad de fuente del pool.
export const candidateSource = pgEnum("candidate_source", [
  "manual",
  "linkedin",
  "referral",
  "job_board",
  "other",
]);

// Estado operativo del candidato en el pool (independiente de cualquier búsqueda).
export const talentState = pgEnum("talent_state", [
  "active", // en pool, disponible
  "passive", // pool pasivo (no busca activamente)
  "contacted", // contactado, a la espera
  "archived", // archivado
]);

// Interacción del candidato con un job en el portal (favorito/ocultar). Global, no por org.
export const candidateJobInteractionKind = pgEnum("candidate_job_interaction_kind", [
  "favorite",
  "hidden",
]);

// Tipo de cuenta: dato explícito fijado UNA vez al registrarse (por handle_new_user, según
// el account_type que manda cada signUp), nunca inferido. Un profile es recruiter O
// candidato, nunca los dos — si algún día hace falta soportar ambos a la vez, es una
// migración de columna acotada, no algo para resolver hoy.
export const accountType = pgEnum("account_type", ["recruiter", "candidate"]);

// Estado de una oferta en su ciclo de vida.
export const offerStatus = pgEnum("offer_status", [
  "draft", // borrador, editable, todavía no enviada
  "sent", // enviada al candidato
  "negotiation", // en negociación
  "accepted", // aceptada (terminal) — dispara cierre de búsqueda + contratación
  "rejected", // rechazada (terminal)
]);

// Canal de mensajería con el candidato.
export const messageChannel = pgEnum("message_channel", ["email", "whatsapp"]);

// Dirección de un mensaje en un hilo.
export const messageDirection = pgEnum("message_direction", ["outbound", "inbound"]);

// Estado de un miembro del equipo (para activar/desactivar acceso).
export const membershipStatus = pgEnum("membership_status", ["active", "inactive"]);

// Estado de una invitación al equipo.
export const invitationStatus = pgEnum("invitation_status", [
  "pending",
  "accepted",
  "revoked",
]);

// Tipo de notificación (para iconografía/agrupación). "candidate_status" = notificación al
// candidato por un cambio en el estado visible de su postulación (no requiere membership).
export const notificationType = pgEnum("notification_type", ["hire", "team", "system", "candidate_status"]);

export const languageLevel = pgEnum("language_level", ["basico", "intermedio", "avanzado", "nativo"]);

// ---- Tenancy ----

// El tenant. Todo dato de dominio cuelga de acá.
export const organizations = pgTable("organizations", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  // Logo del workspace: path en el bucket privado `org-logos` (se sirve vía signed URL).
  logoUrl: text("logo_url"),
  workspaceType: workspaceType("workspace_type"),
  // Preferencias del workspace (zona horaria, etc.). jsonb flexible para no migrar por cada opción.
  preferences: jsonb("preferences"),
  // Career Site (micrositio público de marca-empleadora): gate de autorización primario,
  // por eso es columna propia y no un campo dentro de careerSiteSettings.
  careerSiteEnabled: boolean("career_site_enabled").notNull().default(true),
  // Portada del Career Site: path en el bucket PÚBLICO career-site-media (sin firmar, a
  // diferencia de logoUrl, porque necesita ser resoluble por crawlers de OG/WhatsApp/LinkedIn).
  careerSiteCoverUrl: text("career_site_cover_url"),
  // Branding del Career Site: campos de solo lectura al render, sin filtro/orden/join.
  careerSiteSettings: jsonb("career_site_settings").$type<{
    description?: string;
    primaryColor?: string;
    accentColor?: string;
    website?: string;
    social?: { linkedin?: string; instagram?: string; x?: string; facebook?: string };
  }>(),
  ...timestamps,
}, (t) => ({
  slugIdx: uniqueIndex("organizations_slug_idx").on(t.slug),
}));

// Usuario de la app. Espeja auth.users de Supabase (id = auth.users.id).
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(), // = auth.users.id
  email: text("email").notNull(),
  fullName: text("full_name"),
  // Fijado por handle_new_user al registrarse (nunca inferido de memberships). Default
  // "candidate" = mínimo privilegio para cualquier insert que no lo especifique explícito.
  accountType: accountType("account_type").notNull().default("candidate"),
  cvUrl: text("cv_url"), // path en Supabase Storage para candidatos
  // Perfil extendido del recruiter. Todo opcional. "Miembro desde" se deriva de created_at.
  avatarUrl: text("avatar_url"), // path en bucket privado `avatars` (signed URL)
  jobTitle: text("job_title"), // cargo
  phone: text("phone"),
  location: text("location"),
  linkedinUrl: text("linkedin_url"),
  bio: text("bio"), // resumen breve (≤500 chars, validado en la action)
  // Perfil global del candidato (portal). `location`/`linkedinUrl`/`bio`/`cvUrl` de arriba se
  // reusan tal cual (mismo significado para candidato que para recruiter).
  headline: text("headline"), // puesto/título actual, ej "Frontend Senior"
  skills: text("skills").array(),
  // null = todavía no pasó (o saltó) el onboarding de candidato. No bloquea nada, solo decide
  // si al loguearse cae en /c/onboarding o directo al portal.
  candidateOnboardingCompletedAt: timestamp("candidate_onboarding_completed_at"),
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
  // Activo/inactivo: permite desactivar el acceso de un miembro sin borrarlo.
  status: membershipStatus("status").notNull().default("active"),
  // null = todavía no descartó/terminó el tour de bienvenida. Es por membership (no por
  // organization) para que un miembro invitado más tarde vea el tour aunque el resto ya lo
  // haya cerrado.
  onboardingDismissedAt: timestamp("onboarding_dismissed_at"),
  ...timestamps,
}, (t) => ({
  uniqueMember: uniqueIndex("memberships_org_profile_idx").on(
    t.organizationId,
    t.profileId,
  ),
  orgIdx: index("memberships_org_idx").on(t.organizationId),
}));

// Invitación a sumarse al equipo de una org con un rol. El envío del email es mock por ahora;
// el flujo de aceptación real (registro + alta de membership) queda para después.
export const invitations = pgTable("invitations", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  email: text("email").notNull(),
  role: orgRole("role").notNull().default("recruiter"),
  status: invitationStatus("status").notNull().default("pending"),
  token: text("token").notNull(),
  invitedBy: uuid("invited_by").references(() => profiles.id),
  ...timestamps,
}, (t) => ({
  orgIdx: index("invitations_org_idx").on(t.organizationId),
  tokenIdx: uniqueIndex("invitations_token_idx").on(t.token),
}));

// Notificación dirigida a un miembro de la org, o a un candidato con postulaciones en esa
// org (campana + inbox). RLS: el destinatario ve/marca solo las suyas (profile_id = auth.uid()),
// sin importar si tiene membership — así llegan también a candidatos.
export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  profileId: uuid("profile_id")
    .references(() => profiles.id, { onDelete: "cascade" })
    .notNull(),
  type: notificationType("type").notNull().default("system"),
  title: text("title").notNull(),
  link: text("link"), // ruta interna opcional a la que lleva la notificación
  readAt: timestamp("read_at"), // null = no leída
  ...timestamps,
}, (t) => ({
  // Inbox del usuario: sus notificaciones por org, ordenadas por fecha.
  profileIdx: index("notifications_profile_idx").on(t.profileId, t.createdAt),
  orgIdx: index("notifications_org_idx").on(t.organizationId),
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

// Link de acceso por token para que un Cliente (sin cuenta) pida búsquedas y vea el estado de
// sus solicitudes — camino "Cliente" del Hiring Request (§17 backlog). Mismo patrón que
// `shortlist_shares`, pero atado al `client` (persiste entre solicitudes) en vez de a un
// shortlist puntual: acá no hay nada que compartir todavía cuando se genera el link.
export const clientShares = pgTable("client_shares", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  clientId: uuid("client_id")
    .references(() => clients.id, { onDelete: "cascade" })
    .notNull(),
  token: text("token").notNull(),
  expiresAt: timestamp("expires_at"), // null = sin vencimiento
  revokedAt: timestamp("revoked_at"), // null = activo
  createdBy: uuid("created_by").references(() => profiles.id),
  ...timestamps,
}, (t) => ({
  orgIdx: index("client_shares_org_idx").on(t.organizationId),
  clientIdx: index("client_shares_client_idx").on(t.clientId),
  tokenIdx: uniqueIndex("client_shares_token_idx").on(t.token),
}));

// Búsqueda / aviso.
export const jobs = pgTable("jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  // Cliente para el que es la búsqueda (CRM mínimo). null = búsqueda interna / sin cliente.
  clientId: uuid("client_id").references(() => clients.id, { onDelete: "set null" }),
  // `title` = nombre atractivo de la publicación (headline). El puesto real va en `position`.
  title: text("title").notNull(),
  // Puesto real a cubrir (ej. "Senior Data Analyst"). Es el rol canónico que usa la IA/matching.
  position: text("position"),
  description: text("description"), // brief interno
  // Texto del aviso público LEGACY: el aviso ahora se renderiza desde los campos estructurados
  // (objectives/requirements/responsibilities/benefits + meta). Se conserva por compat.
  posting: text("posting"),
  status: jobStatus("status").notNull().default("draft"),
  // Campos ricos. Todos opcionales para no romper filas existentes.
  jobArea: jobArea("job_area"),
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
  vacancies: integer("vacancies"),
  // Secciones del aviso, en Markdown.
  objectives: text("objectives"),
  requirements: text("requirements"),
  responsibilities: text("responsibilities"),
  // Beneficios: lista de {name, description}. Solo-de-mostrar → jsonb (sin tabla hija ni
  // transacciones extra; ver decisión de performance). Se selecciona solo en el detalle.
  benefits: jsonb("benefits").$type<{ name: string; description: string }[]>(),
  viewCount: integer("view_count").notNull().default(0),
  createdBy: uuid("created_by").references(() => profiles.id),
  ...timestamps,
}, (t) => ({
  orgIdx: index("jobs_org_idx").on(t.organizationId),
  clientIdx: index("jobs_client_idx").on(t.clientId),
}));

// Solicitud de búsqueda (Hiring Request, §17 backlog). La pide un Cliente externo (camino
// Consultora/Freelance, sin cuenta, por `client_shares`) o un Hiring Manager interno (camino
// Empresa/Enterprise, con cuenta — todavía no construido, `createdByProfileId` es forward
// para cuando se arranque esa mitad). Exactamente uno de los dos debe estar seteado.
// Aprobada → genera un `job` vinculado (no lo reemplaza, son entidades distintas).
export const requisitions = pgTable("requisitions", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  clientId: uuid("client_id").references(() => clients.id, { onDelete: "cascade" }),
  createdByProfileId: uuid("created_by_profile_id").references(() => profiles.id),
  status: requisitionStatus("status").notNull().default("pending"),
  reason: requisitionReason("reason").notNull(),
  budget: text("budget"), // texto libre (sin moneda estructurada, v1)
  estimatedStartDate: date("estimated_start_date"),
  // Mismos campos ricos de JD que `jobs` (ver arriba) — se copian a `jobs` recién al aprobar.
  title: text("title").notNull(),
  position: text("position"),
  jobArea: jobArea("job_area"),
  location: text("location"),
  modality: jobModality("modality"),
  seniority: jobSeniority("seniority"),
  employmentType: employmentType("employment_type"),
  skills: text("skills").array(),
  objectives: text("objectives"),
  requirements: text("requirements"),
  responsibilities: text("responsibilities"),
  benefits: jsonb("benefits").$type<{ name: string; description: string }[]>(),
  // Comentario del recruiter al aprobar/rechazar (ej. motivo de rechazo). Visible para quien pidió.
  reviewNote: text("review_note"),
  reviewedBy: uuid("reviewed_by").references(() => profiles.id),
  reviewedAt: timestamp("reviewed_at"),
  jobId: uuid("job_id").references(() => jobs.id, { onDelete: "set null" }),
  ...timestamps,
}, (t) => ({
  orgIdx: index("requisitions_org_idx").on(t.organizationId),
  clientIdx: index("requisitions_client_idx").on(t.clientId),
  statusIdx: index("requisitions_status_idx").on(t.organizationId, t.status),
  sourceCheck: check(
    "requisitions_source_check",
    sql`(${t.clientId} is not null) <> (${t.createdByProfileId} is not null)`,
  ),
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
  phone: text("phone"),
  cvUrl: text("cv_url"), // path en Supabase Storage
  // Campos enriquecidos de la ficha (paridad demo). Todos opcionales.
  headline: text("headline"), // puesto/título actual, ej "Frontend Senior @ Acme"
  location: text("location"),
  linkedinUrl: text("linkedin_url"),
  summary: text("summary"), // experiencia / bio en texto libre
  skills: text("skills").array(),
  source: candidateSource("source"),
  // Estado operativo en el pool (lifecycle del candidato, no de una postulación).
  talentState: talentState("talent_state").notNull().default("active"),
  // Consentimiento de tratamiento de datos (GDPR-lite). null = no registrado.
  consentAcceptedAt: timestamp("consent_accepted_at"),
  ...timestamps,
}, (t) => ({
  orgIdx: index("candidates_org_idx").on(t.organizationId),
  profileIdx: index("candidates_profile_idx").on(t.profileId),
}));

// Las 3 tablas de currículum (experiencia/educación/certificaciones) comparten el mismo
// modelo de dueño: cada fila es O de un profile_id (currículum global, autoservicio del
// candidato) O de un candidate_id (nota de sourcing del recruiter en su pool, por
// organization) — nunca ambos, nunca ninguno. Nunca se fusionan entre sí: son dos fuentes
// de datos independientes. Ver .claude/rules/database.md y la migración que agrega el
// constraint `check` (Drizzle no genera el CHECK solo con `.references()`, se agrega a mano).

// Experiencia laboral: uno o más períodos de trabajo.
export const candidateWorkExperiences = pgTable("candidate_work_experiences", {
  id: uuid("id").defaultRandom().primaryKey(),
  profileId: uuid("profile_id").references(() => profiles.id, { onDelete: "cascade" }),
  candidateId: uuid("candidate_id").references(() => candidates.id, { onDelete: "cascade" }),
  company: text("company").notNull(),
  position: text("position").notNull(),
  startDate: date("start_date"),
  endDate: date("end_date"), // null = actualidad (trabajo en curso)
  description: text("description"),
  employmentType: employmentType("employment_type"),
  modality: jobModality("modality"),
  skills: text("skills").array(),
  ...timestamps,
}, (t) => ({
  profileIdx: index("candidate_work_experiences_profile_idx").on(t.profileId),
  candidateIdx: index("candidate_work_experiences_candidate_idx").on(t.candidateId),
  ownerCheck: check(
    "candidate_work_experiences_owner_check",
    sql`(${t.profileId} is not null) <> (${t.candidateId} is not null)`,
  ),
}));

// Educación: uno o más estudios (universidad, curso, etc).
export const candidateEducation = pgTable("candidate_education", {
  id: uuid("id").defaultRandom().primaryKey(),
  profileId: uuid("profile_id").references(() => profiles.id, { onDelete: "cascade" }),
  candidateId: uuid("candidate_id").references(() => candidates.id, { onDelete: "cascade" }),
  institution: text("institution").notNull(),
  degree: text("degree").notNull(), // Título o carrera
  fieldOfStudy: text("field_of_study"), // Área de estudio
  startDate: date("start_date"),
  endDate: date("end_date"),
  description: text("description"),
  grade: text("grade"), // Calificación
  activities: text("activities"),
  ...timestamps,
}, (t) => ({
  profileIdx: index("candidate_education_profile_idx").on(t.profileId),
  candidateIdx: index("candidate_education_candidate_idx").on(t.candidateId),
  ownerCheck: check(
    "candidate_education_owner_check",
    sql`(${t.profileId} is not null) <> (${t.candidateId} is not null)`,
  ),
}));

// Certificaciones: uno o más certificados/cursos con constancia.
export const candidateCertifications = pgTable("candidate_certifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  profileId: uuid("profile_id").references(() => profiles.id, { onDelete: "cascade" }),
  candidateId: uuid("candidate_id").references(() => candidates.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  url: text("url"),
  ...timestamps,
}, (t) => ({
  profileIdx: index("candidate_certifications_profile_idx").on(t.profileId),
  candidateIdx: index("candidate_certifications_candidate_idx").on(t.candidateId),
  ownerCheck: check(
    "candidate_certifications_owner_check",
    sql`(${t.profileId} is not null) <> (${t.candidateId} is not null)`,
  ),
}));

export const candidateLanguages = pgTable("candidate_languages", {
  id: uuid("id").defaultRandom().primaryKey(),
  profileId: uuid("profile_id").references(() => profiles.id, { onDelete: "cascade" }),
  candidateId: uuid("candidate_id").references(() => candidates.id, { onDelete: "cascade" }),
  language: text("language").notNull(),
  level: languageLevel("level").notNull(),
  ...timestamps,
}, (t) => ({
  profileIdx: index("candidate_languages_profile_idx").on(t.profileId),
  candidateIdx: index("candidate_languages_candidate_idx").on(t.candidateId),
  ownerCheck: check(
    "candidate_languages_owner_check",
    sql`(${t.profileId} is not null) <> (${t.candidateId} is not null)`,
  ),
}));

// Favoritos/ocultos del candidato sobre un job en el portal. Global (no por organization):
// es una preferencia del candidato, no del pool de ninguna org.
export const candidateJobInteractions = pgTable("candidate_job_interactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  profileId: uuid("profile_id")
    .references(() => profiles.id, { onDelete: "cascade" })
    .notNull(),
  jobId: uuid("job_id")
    .references(() => jobs.id, { onDelete: "cascade" })
    .notNull(),
  kind: candidateJobInteractionKind("kind").notNull(),
  ...timestamps,
}, (t) => ({
  profileIdx: index("candidate_job_interactions_profile_idx").on(t.profileId),
  uniqueInteraction: uniqueIndex("candidate_job_interactions_unique_idx").on(
    t.profileId,
    t.jobId,
    t.kind,
  ),
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
  // Etapa real de la postulación dentro del pipeline de SU búsqueda. `stage` (el enum)
  // queda como espejo mientras se migran los consumidores que todavía lo leen.
  stageId: uuid("stage_id").references(() => jobStages.id, { onDelete: "restrict" }),
  pipelineEnteredAt: timestamp("pipeline_entered_at"),
  // Marcador liviano de favorito/destacado para el triage de postulados. No es el shortlist
  // (que es la selección formal que se comparte con la empresa): es una estrella del recruiter.
  isFavorite: boolean("is_favorite").notNull().default(false),
  // Resultado de IA (mock por ahora) persistido para que la UI sea real. null = sin analizar.
  aiScore: integer("ai_score"), // 0–100, compatibilidad estimada con la búsqueda
  aiSummary: text("ai_summary"), // resumen corto del match
  // Nota interna del reclutador sobre el candidato en este proceso. No visible para la empresa.
  notes: text("notes"),
  // Mensaje que el propio candidato adjuntó al postularse (Career Site). Distinto de `notes`:
  // ese es privado del reclutador, esto lo escribe el candidato y es visible para el reclutador.
  coverNote: text("cover_note"),
  ...timestamps,
}, (t) => ({
  orgIdx: index("applications_org_idx").on(t.organizationId),
  jobIdx: index("applications_job_idx").on(t.jobId),
  // Acceso "búsquedas de un candidato" (ficha de candidato): filtra por candidate_id.
  candidateIdx: index("applications_candidate_idx").on(t.candidateId),
  // Un candidato no puede estar dos veces en la misma búsqueda (bug: pipeline duplicaba
  // candidatos bajo check-then-insert sin lock). Respaldo a nivel DB de la regla de negocio
  // que ya valida postularCandidato.
  uniqueJobCandidate: uniqueIndex("applications_job_candidate_unique").on(
    t.jobId,
    t.candidateId,
  ),
}));

// Pregunta de screening definida por el recruiter para una búsqueda puntual (§6 backlog).
// `options` solo aplica a type = 'multiple_choice'. `position` = orden de presentación al
// candidato (orden de carga en el form, sin drag&drop todavía — mismo criterio que `benefits`).
export const screeningQuestions = pgTable("screening_questions", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  jobId: uuid("job_id")
    .references(() => jobs.id, { onDelete: "cascade" })
    .notNull(),
  type: screeningQuestionType("type").notNull(),
  label: text("label").notNull(),
  options: text("options").array(),
  required: boolean("required").notNull().default(true),
  position: integer("position").notNull().default(0),
  isCriterion: boolean("is_criterion").notNull().default(false),
  expectedValues: text("expected_values").array(),
  minValue: integer("min_value"),
  maxValue: integer("max_value"),
  ...timestamps,
}, (t) => ({
  jobIdx: index("screening_questions_job_idx").on(t.jobId, t.position),
}));

// Respuesta del candidato a una pregunta de screening, al postularse. `value` guarda el
// texto tal cual se muestra al recruiter (sí/no ya resuelto a texto, número como string,
// la opción elegida) — es dato de solo-lectura para el recruiter, no se recalcula.
export const screeningAnswers = pgTable("screening_answers", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  applicationId: uuid("application_id")
    .references(() => applications.id, { onDelete: "cascade" })
    .notNull(),
  questionId: uuid("question_id")
    .references(() => screeningQuestions.id, { onDelete: "cascade" })
    .notNull(),
  value: text("value").notNull(),
  ...timestamps,
}, (t) => ({
  applicationIdx: index("screening_answers_application_idx").on(t.applicationId),
  // Una respuesta por pregunta por postulación — apply_to_career_site_job inserta una vez.
  uniqueAnswer: uniqueIndex("screening_answers_application_question_idx").on(
    t.applicationId,
    t.questionId,
  ),
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
  type: interviewType("type").notNull().default("screening"),
  // Lugar (dirección) o link de la videollamada según la modalidad. Opcional.
  location: text("location"),
  // Notas internas de la entrevista (agenda, feedback). No visible para la empresa.
  notes: text("notes"),
  status: interviewStatus("status").notNull().default("scheduled"),
  createdBy: uuid("created_by").references(() => profiles.id),
  // Emails invitados al evento (colegas de equipo y/o externos). Array simple, sin tabla
  // intermedia — alcance acotado a "agregar participantes", no un módulo de invitados.
  participantEmails: text("participant_emails").array(),
  // Id del evento en Google Calendar si se sincronizó (null = no sincronizada: sin conexión
  // del creador, o falló). Se usa para propagar updates/cancelaciones al mismo evento.
  googleEventId: text("google_event_id"),
  // Motivo del último intento de sync fallido, para mostrarlo al recruiter. null = sin error
  // (sincronizada o nunca se intentó por no tener conexión).
  googleSyncError: text("google_sync_error"),
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

// Conexión OAuth de un recruiter con su propio Google Calendar. Por profile (no por org):
// cada persona conecta su cuenta y sus entrevistas agendadas sincronizan a SU calendario.
export const googleCalendarConnections = pgTable("google_calendar_connections", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  profileId: uuid("profile_id")
    .references(() => profiles.id, { onDelete: "cascade" })
    .notNull(),
  googleEmail: text("google_email").notNull(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  ...timestamps,
}, (t) => ({
  uniqueMember: uniqueIndex("google_calendar_connections_profile_idx").on(
    t.organizationId,
    t.profileId,
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
  // Solo se completan cuando toStage = "rejected". rejectionNote es privada del recruiter.
  rejectionReason: rejectionReason("rejection_reason"),
  rejectionNote: text("rejection_note"),
  ...timestamps,
}, (t) => ({
  orgIdx: index("application_events_org_idx").on(t.organizationId),
  applicationIdx: index("application_events_application_idx").on(t.applicationId),
}));

// Qué significa una etapa para el resto del sistema. El nombre lo elige el recruiter y no
// se puede interpretar; el `kind` es lo que leen el portal del candidato, los reportes y el
// cierre de la búsqueda. Sin esto, agregar una etapa propia ("Challenge Técnico") dejaría a
// esos consumidores sin saber qué mostrar.
export const stageKind = pgEnum("stage_kind", [
  "inbox", // bandeja de Postulados: todavía sin decisión
  "in_process", // cualquier etapa intermedia del proceso
  "offer",
  "hired",
  "rejected",
]);

// Etapas del pipeline de UNA búsqueda. Cada job tiene las suyas: agregarlas, renombrarlas,
// reordenarlas o borrarlas no afecta al resto de las búsquedas.
export const jobStages = pgTable("job_stages", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  jobId: uuid("job_id")
    .references(() => jobs.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  position: integer("position").notNull(),
  slaDays: integer("sla_days"),
  kind: stageKind("kind").notNull(),
  // De qué etapa del enum salió al migrar. Solo lo tienen las etapas sembradas: sirve para
  // mantener `applications.stage` en sync mientras los consumidores viejos siguen leyéndolo.
  // Las etapas creadas por el recruiter lo tienen en null y derivan su valor del `kind`.
  legacyStage: applicationStage("legacy_stage"),
  ...timestamps,
}, (t) => ({
  jobIdx: index("job_stages_job_idx").on(t.jobId, t.position),
  orgIdx: index("job_stages_org_idx").on(t.organizationId),
}));

// Configuración de etapas del pipeline por organización.
// Metadata sobre el enum: no cambia la identidad canónica de las etapas, solo permite
// override de label, activar/desactivar columnas en el kanban y configurar SLA.
export const pipelineStages = pgTable("pipeline_stages", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  stageKey: applicationStage("stage_key").notNull(),
  labelOverride: text("label_override"),
  isActive: boolean("is_active").notNull().default(true),
  slaDays: integer("sla_days"),
  ...timestamps,
}, (t) => ({
  orgIdx: index("pipeline_stages_org_idx").on(t.organizationId),
  uniqueOrgStage: uniqueIndex("pipeline_stages_org_stage_idx").on(
    t.organizationId,
    t.stageKey,
  ),
}));

// Oferta formal a un candidato finalista de una búsqueda. Apunta a la application (job +
// candidato) para que aceptar la oferta pueda contratar a ese candidato y cerrar la búsqueda.
export const offers = pgTable("offers", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  jobId: uuid("job_id")
    .references(() => jobs.id, { onDelete: "cascade" })
    .notNull(),
  applicationId: uuid("application_id")
    .references(() => applications.id, { onDelete: "cascade" })
    .notNull(),
  title: text("title").notNull(), // puesto ofrecido
  salaryAmount: integer("salary_amount"),
  salaryCurrency: text("salary_currency"),
  benefits: text("benefits"),
  startDate: date("start_date"),
  validUntil: date("valid_until"), // vencimiento de la oferta
  body: text("body"), // texto de la carta de oferta
  status: offerStatus("status").notNull().default("draft"),
  createdBy: uuid("created_by").references(() => profiles.id),
  ...timestamps,
}, (t) => ({
  orgIdx: index("offers_org_idx").on(t.organizationId),
  jobIdx: index("offers_job_idx").on(t.jobId),
  applicationIdx: index("offers_application_idx").on(t.applicationId),
}));

// Template reutilizable de mensaje (canned response) por canal.
export const messageTemplates = pgTable("message_templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  channel: messageChannel("channel").notNull().default("email"),
  body: text("body").notNull(),
  createdBy: uuid("created_by").references(() => profiles.id),
  ...timestamps,
}, (t) => ({
  orgIdx: index("message_templates_org_idx").on(t.organizationId),
}));

// Hilo de conversación con un candidato por un canal. Un candidato puede tener un hilo de
// email y otro de whatsapp. lastMessageAt ordena el inbox sin recalcular.
export const messageThreads = pgTable("message_threads", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  candidateId: uuid("candidate_id")
    .references(() => candidates.id, { onDelete: "cascade" })
    .notNull(),
  channel: messageChannel("channel").notNull().default("email"),
  subject: text("subject"),
  lastMessageAt: timestamp("last_message_at").defaultNow().notNull(),
  createdBy: uuid("created_by").references(() => profiles.id),
  ...timestamps,
}, (t) => ({
  orgIdx: index("message_threads_org_idx").on(t.organizationId),
  // Inbox: hilos de la org ordenados por actividad.
  orgActivityIdx: index("message_threads_org_activity_idx").on(
    t.organizationId,
    t.lastMessageAt,
  ),
  // Un hilo por (candidato, canal).
  uniqueThread: uniqueIndex("message_threads_candidate_channel_idx").on(
    t.candidateId,
    t.channel,
  ),
}));

// Mensaje dentro de un hilo. El envío saliente sigue siendo mock (no hay integración real de
// envío); el canal `email` sí tiene lectura real: `externalId` (id del mensaje en Gmail) marca
// los que vinieron del sync — permite re-sincronizar sin duplicar (§8 backlog).
export const messages = pgTable("messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  threadId: uuid("thread_id")
    .references(() => messageThreads.id, { onDelete: "cascade" })
    .notNull(),
  direction: messageDirection("direction").notNull().default("outbound"),
  body: text("body").notNull(),
  // null = mensaje nativo de WeHunter (mock). Con valor = vino del sync de Gmail (id real del
  // mensaje). Postgres no exige unicidad entre NULLs, así que esto no molesta a los mocks.
  externalId: text("external_id"),
  createdBy: uuid("created_by").references(() => profiles.id),
  ...timestamps,
}, (t) => ({
  orgIdx: index("messages_org_idx").on(t.organizationId),
  threadIdx: index("messages_thread_idx").on(t.threadId),
  uniqueExternal: uniqueIndex("messages_thread_external_idx").on(t.threadId, t.externalId),
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
  // null = la empresa todavía no pidió entrevista para este candidato. Se setea desde la
  // función SECURITY DEFINER request_shortlist_interview (acceso sin cuenta, por token).
  interviewRequestedAt: timestamp("interview_requested_at"),
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
export type ClientShare = typeof clientShares.$inferSelect;
export type PipelineStageRow = typeof pipelineStages.$inferSelect;
export type Job = typeof jobs.$inferSelect;
export type Requisition = typeof requisitions.$inferSelect;
export type Candidate = typeof candidates.$inferSelect;
export type CandidateWorkExperience = typeof candidateWorkExperiences.$inferSelect;
export type CandidateEducation = typeof candidateEducation.$inferSelect;
export type CandidateCertification = typeof candidateCertifications.$inferSelect;
export type CandidateLanguage = typeof candidateLanguages.$inferSelect;
export type LanguageLevel = (typeof languageLevel.enumValues)[number];
export type CandidateJobInteraction = typeof candidateJobInteractions.$inferSelect;
export type Application = typeof applications.$inferSelect;
export type ScreeningQuestion = typeof screeningQuestions.$inferSelect;
export type ScreeningAnswer = typeof screeningAnswers.$inferSelect;
export type Interview = typeof interviews.$inferSelect;
export type Note = typeof notes.$inferSelect;
export type ApplicationEvent = typeof applicationEvents.$inferSelect;
export type Offer = typeof offers.$inferSelect;
export type MessageTemplate = typeof messageTemplates.$inferSelect;
export type MessageThread = typeof messageThreads.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Invitation = typeof invitations.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
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
