import type { OrgRole } from "@/lib/auth/session";
import { can } from "@/lib/auth/roles";

/**
 * Caso de uso: sumar candidatos a una shortlist YA creada (botón "+ Agregar candidato").
 * El link compartido no cambia — `get_shared_shortlist` lee `shortlist_candidates` en vivo,
 * así que lo agregado aparece solo en la vista del cliente. Autorización primaria:
 * `shortlists.manage` + la shortlist tiene que ser de la org.
 */

export type AgregarCandidatosShortlistInput = {
  shortlistId: string;
  applicationIds: string[];
};

export type AgregarCandidatosShortlistContext = {
  userId: string;
  organizationId: string;
  role: OrgRole;
};

export type AgregarCandidatosShortlistDeps = {
  getShortlistById: (
    shortlistId: string,
    organizationId: string,
  ) => Promise<{ id: string; jobId: string } | null>;
  /** De los applicationIds pedidos, los que realmente son de ese job y esa org (anti-tamper). */
  filterValidApplications: (
    jobId: string,
    organizationId: string,
    applicationIds: string[],
  ) => Promise<string[]>;
  addCandidatesToShortlist: (data: {
    organizationId: string;
    shortlistId: string;
    applicationIds: string[];
  }) => Promise<{ added: number }>;
};

export async function agregarCandidatosAShortlist(
  input: AgregarCandidatosShortlistInput,
  ctx: AgregarCandidatosShortlistContext,
  deps: AgregarCandidatosShortlistDeps,
): Promise<{ ok: true; data: { added: number } } | { ok: false; error: string }> {
  if (!can(ctx.role, "shortlists.manage")) {
    return { ok: false, error: "Tu rol no permite gestionar shortlists." };
  }

  if (input.applicationIds.length === 0) {
    return { ok: false, error: "Seleccioná al menos un candidato para agregar." };
  }

  const shortlist = await deps.getShortlistById(input.shortlistId, ctx.organizationId);
  if (!shortlist) {
    return { ok: false, error: "Shortlist no encontrada." };
  }

  // Los candidatos tienen que ser postulaciones reales de la MISMA búsqueda de la shortlist
  // (un id manipulado no puede colar a alguien de otro job o de otro tenant).
  const validIds = await deps.filterValidApplications(
    shortlist.jobId,
    ctx.organizationId,
    input.applicationIds,
  );
  if (validIds.length === 0) {
    return {
      ok: false,
      error: "Ningún candidato seleccionado es válido para esta búsqueda.",
    };
  }

  // El insert es idempotente (índice único + onConflictDoNothing): re-agregar a alguien que
  // ya está no rompe. `added` = los que se sumaron de verdad.
  const { added } = await deps.addCandidatesToShortlist({
    organizationId: ctx.organizationId,
    shortlistId: shortlist.id,
    applicationIds: validIds,
  });

  return { ok: true, data: { added } };
}
