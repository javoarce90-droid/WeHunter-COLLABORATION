import {
  pgTable,
  uuid,
  text,
  timestamp,
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

// Búsqueda / aviso.
export const jobs = pgTable("jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  title: text("title").notNull(),
  description: text("description"),
  status: jobStatus("status").notNull().default("draft"),
  createdBy: uuid("created_by").references(() => profiles.id),
  ...timestamps,
}, (t) => ({
  orgIdx: index("jobs_org_idx").on(t.organizationId),
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
  ...timestamps,
}, (t) => ({
  orgIdx: index("applications_org_idx").on(t.organizationId),
  jobIdx: index("applications_job_idx").on(t.jobId),
}));

// Tipos inferidos (fuente de verdad de los tipos de datos)
export type Organization = typeof organizations.$inferSelect;
export type Job = typeof jobs.$inferSelect;
export type Candidate = typeof candidates.$inferSelect;
export type Application = typeof applications.$inferSelect;

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
 */
export const RLS_TENANT_ISOLATION = sql``; // marcador: implementar políticas en migración
