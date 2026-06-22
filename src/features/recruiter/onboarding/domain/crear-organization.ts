import { ok, err, type Result } from "@/lib/result";

/**
 * Caso de uso: crear la organization (workspace) de un reclutador y dejarlo como `owner`.
 * Es el bootstrap de tenancy: una cuenta recién registrada no tiene organization hasta
 * que pasa por acá. Ver docs/DATA_MODEL.md (Organization / Membership).
 *
 * Reglas de negocio que vivien acá:
 *  - Debe haber un usuario autenticado (lo será el owner).
 *  - El nombre se normaliza y de él se deriva un slug.
 * La escritura atómica (organization + membership owner) la hace la capa data.
 */

export interface CrearOrganizationInput {
  name: string;
}

export interface CrearOrganizationCtx {
  userId: string | null;
}

export interface CrearOrganizationDeps {
  /** Crea organization + membership(owner) de forma atómica y devuelve el id de la org. */
  createOrganizationWithOwner(args: {
    name: string;
    slug: string;
    ownerId: string;
  }): Promise<{ organizationId: string }>;
}

/** Deriva un slug url-safe a partir del nombre del workspace. */
export function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // quita acentos (combining diacritics)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function crearOrganization(
  input: CrearOrganizationInput,
  ctx: CrearOrganizationCtx,
  deps: CrearOrganizationDeps,
): Promise<Result<{ organizationId: string }>> {
  if (!ctx.userId) {
    return err("Necesitás estar autenticado para crear un workspace.");
  }

  const name = input.name.trim();
  if (name.length < 2) {
    return err("El nombre del workspace es demasiado corto.");
  }

  const slug = slugify(name);
  if (!slug) {
    return err("El nombre debe tener al menos una letra o número.");
  }

  const { organizationId } = await deps.createOrganizationWithOwner({
    name,
    slug,
    ownerId: ctx.userId,
  });

  return ok({ organizationId });
}
