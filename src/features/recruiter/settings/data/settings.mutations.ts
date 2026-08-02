import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { organizations, profiles } from "@/db/schema";

export interface ProfilePatch {
  fullName?: string;
  jobTitle?: string | null;
  phone?: string | null;
  location?: string | null;
  linkedinUrl?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
}

/** Actualiza el perfil del usuario actual. RLS: la política own_profile_update solo deja el propio. */
export async function updateOwnProfile(userId: string, patch: ProfilePatch): Promise<void> {
  const db = await getDb();
  await db.rls(
    (tx) =>
      tx
        .update(profiles)
        .set({ ...patch, updatedAt: new Date() })
        .where(eq(profiles.id, userId)),
    "db.settings.update-profile",
  );
}

export interface CareerSiteBranding {
  description?: string;
  primaryColor?: string;
  accentColor?: string;
  website?: string;
  social?: { linkedin?: string; instagram?: string; x?: string; facebook?: string };
}

export interface OrgPatch {
  name?: string;
  slug?: string;
  logoUrl?: string | null;
  careerSiteCoverUrl?: string;
  careerSiteSettings?: CareerSiteBranding;
}

/** El slug pedido ya lo usa otro workspace (choque contra organizations_slug_idx). */
export class SlugTakenError extends Error {
  constructor() {
    super("Ese slug ya está en uso por otro workspace.");
    this.name = "SlugTakenError";
  }
}

function isSlugUniqueViolation(err: unknown): boolean {
  const e = err as { code?: string; constraint_name?: string } | null;
  return e?.code === "23505" && e?.constraint_name === "organizations_slug_idx";
}

/** Actualiza el workspace. RLS: org_admin_can_update solo deja al owner/admin de esa org. */
export async function updateOrganization(organizationId: string, patch: OrgPatch): Promise<void> {
  const db = await getDb();
  try {
    await db.rls(
      (tx) =>
        tx
          .update(organizations)
          .set({ ...patch, updatedAt: new Date() })
          .where(eq(organizations.id, organizationId)),
      "db.settings.update-organization",
    );
  } catch (err) {
    if (isSlugUniqueViolation(err)) throw new SlugTakenError();
    throw err;
  }
}

/** Borra el workspace. RLS: org_owner_can_delete solo deja al owner de esa org. Cascada FK
 *  sobre organization_id ya borra el resto de las tablas de dominio (memberships, jobs,
 *  applications, clients, etc.) — no hace falta borrado manual tabla por tabla.
 *
 * Un DELETE que no matchea ninguna policy de RLS borra 0 filas SIN lanzar error — por eso se
 * verifica `returning()`: si no vino nada, algo real está mal (política ausente/desalineada,
 * o el organizationId ya no corresponde a este owner) y hay que enterarse, no fingir éxito. */
export async function deleteOrganization(organizationId: string): Promise<void> {
  const db = await getDb();
  const deleted = await db.rls(
    (tx) => tx.delete(organizations).where(eq(organizations.id, organizationId)).returning({ id: organizations.id }),
    "db.settings.delete-organization",
  );
  if (deleted.length === 0) {
    throw new Error("No se pudo eliminar el workspace: no se encontró o no hay permiso.");
  }
}
