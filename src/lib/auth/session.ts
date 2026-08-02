import { cache } from "react";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { getAuth, getDb } from "@/db/client";
import { accountType, memberships, orgRole, organizations, profiles } from "@/db/schema";

export type OrgRole = (typeof orgRole.enumValues)[number];
export type AccountType = (typeof accountType.enumValues)[number];

/** Cuál de las memberships del usuario está viendo. Ver `getActiveMembership`. */
export const ACTIVE_ORG_COOKIE = "wh.active_org";

/**
 * Helpers de sesión y tenancy. Son la base de la autorización: cada caso de uso del
 * dominio recibe el contexto que devuelven estas funciones (userId, organizationId, rol)
 * y decide qué se puede hacer. Ver .claude/rules/architecture.md y database.md.
 */

export interface ActiveMembership {
  id: string;
  organizationId: string;
  /** Nombre/slug de la org — vienen del mismo join, gratis: los usa el selector de workspace. */
  organizationName: string;
  organizationSlug: string;
  role: OrgRole;
  /** Cliente al que este recruiter está atado en exclusiva. null = sin asignación. */
  assignedClientId: string | null;
}

/**
 * Usuario autenticado actual (Supabase Auth) o null si no hay sesión.
 * Reusa getAuth() (cache() por request): el getUser() remoto se hace UNA sola vez
 * por request aunque el layout y la page pidan el usuario por separado.
 */
export async function getCurrentUser() {
  const { user } = await getAuth();
  return user;
}

/**
 * TODAS las memberships del usuario actual (una persona puede pertenecer a varias orgs —
 * invitada a más de un workspace), con nombre/slug de cada organización vía join. Única query
 * de la que salen tanto `getActiveMembership()` como el selector de workspace: cache() por
 * request evita pagar dos transacciones por lo mismo si ambos la piden en el mismo render.
 *
 * Usa el cliente RLS: Postgres solo devuelve las memberships del propio usuario (política
 * `is_org_member` en `organizations`, no recursiva en `memberships`).
 */
export const getMyMemberships = cache(async (): Promise<ActiveMembership[]> => {
  const db = await getDb();
  if (!db.userId) return [];

  return db.rls(
    (tx) =>
      tx
        .select({
          id: memberships.id,
          organizationId: memberships.organizationId,
          organizationName: organizations.name,
          organizationSlug: organizations.slug,
          role: memberships.role,
          assignedClientId: memberships.assignedClientId,
        })
        .from(memberships)
        .innerJoin(organizations, eq(memberships.organizationId, organizations.id))
        .where(eq(memberships.profileId, db.userId!))
        .orderBy(memberships.createdAt),
    "db.membership",
  );
});

/**
 * Membership "activa" del usuario actual: con qué organization y rol opera. Si tiene varias
 * (ver `getMyMemberships`), la elección se persiste en la cookie `wh.active_org` (la setea el
 * selector de workspace, `workspace-switcher/actions.ts`). Sin cookie, o si la cookie no
 * corresponde a ninguna membership real de este usuario (org ajena, o a la que perdió acceso),
 * cae a la más vieja por `createdAt` — nunca se confía en la cookie a ciegas, se valida contra
 * lo que Postgres devolvió para ESTE usuario. Devuelve null si el usuario no tiene ninguna
 * membership todavía → hay que onboardear (crear organization).
 *
 * cache() por request: el layout y la page la piden por separado, pero la query a la base
 * corre UNA sola vez. Si ves "db.membership" dos veces en la terminal, algo rompió la dedup.
 */
export const getActiveMembership = cache(
  async (): Promise<ActiveMembership | null> => {
    const rows = await getMyMemberships();
    if (rows.length === 0) return null;

    const activeOrgId = (await cookies()).get(ACTIVE_ORG_COOKIE)?.value;
    return rows.find((m) => m.organizationId === activeOrgId) ?? rows[0];
  },
);

/**
 * Tipo de cuenta REAL del usuario actual (fijado explícito al registrarse por
 * handle_new_user, nunca inferido de si tiene o no membership — un recruiter que abandona
 * el onboarding sin crear organization también tendría cero memberships, y sería
 * indistinguible de un candidato si se infiriera). `null` si no hay sesión.
 * cache() por request, mismo motivo que getActiveMembership/getCandidateProfile.
 */
export const getAccountType = cache(async (): Promise<AccountType | null> => {
  const db = await getDb();
  if (!db.userId) return null;

  const rows = await db.rls(
    (tx) =>
      tx
        .select({ accountType: profiles.accountType })
        .from(profiles)
        .where(eq(profiles.id, db.userId!))
        .limit(1),
    "db.accountType",
  );

  return rows[0]?.accountType ?? null;
});

export interface CandidateProfile {
  id: string;
  email: string;
  fullName: string | null;
  phone: string | null;
  headline: string | null;
  location: string | null;
  linkedinUrl: string | null;
  bio: string | null;
  cvUrl: string | null;
  skills: string[] | null;
  candidateOnboardingCompletedAt: Date | null;
}

/**
 * Perfil del candidato autenticado (distinto de getActiveMembership: un candidato no tiene
 * membership de organization). `candidateOnboardingCompletedAt === null` es la señal de
 * "todavía no pasó (o saltó) el onboarding de candidato" — no bloquea nada, solo decide el
 * destino post-login (`/c/onboarding` vs portal). cache() por request, mismo motivo que
 * getActiveMembership.
 */
export const getCandidateProfile = cache(
  async (): Promise<CandidateProfile | null> => {
    const db = await getDb();
    if (!db.userId) return null;

    const rows = await db.rls(
      (tx) =>
        tx
          .select({
            id: profiles.id,
            email: profiles.email,
            fullName: profiles.fullName,
            phone: profiles.phone,
            headline: profiles.headline,
            location: profiles.location,
            linkedinUrl: profiles.linkedinUrl,
            bio: profiles.bio,
            cvUrl: profiles.cvUrl,
            skills: profiles.skills,
            candidateOnboardingCompletedAt: profiles.candidateOnboardingCompletedAt,
          })
          .from(profiles)
          .where(eq(profiles.id, db.userId!))
          .limit(1),
      "db.candidateProfile",
    );

    return rows[0] ?? null;
  },
);
