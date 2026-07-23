/**
 * Caso de uso: un Cliente sin cuenta pide una búsqueda (Hiring Request, §17 backlog).
 *
 * No hay contexto de usuario ni de organización: la autorización la hace por completo la
 * función SECURITY DEFINER vía token (valida vigencia y deriva de ahí la org y el cliente).
 * Acá viven las reglas de negocio del contenido de la solicitud.
 */

export const REQUISITION_REASONS = ["new_position", "backfill"] as const;
export type RequisitionReason = (typeof REQUISITION_REASONS)[number];

export type RequisitionDraft = {
  reason: RequisitionReason;
  title: string;
  position: string | null;
  jobArea: string | null;
  location: string | null;
  modality: string | null;
  seniority: string | null;
  employmentType: string | null;
  skills: string[] | null;
  budget: string | null;
  estimatedStartDate: string | null;
  objectives: string | null;
  requirements: string | null;
  responsibilities: string | null;
};

export type SolicitarBusquedaInput = {
  token: string;
  reason: string;
  title: string;
  position?: string | null;
  jobArea?: string | null;
  location?: string | null;
  modality?: string | null;
  seniority?: string | null;
  employmentType?: string | null;
  skills?: string[] | null;
  budget?: string | null;
  estimatedStartDate?: string | null;
  objectives?: string | null;
  requirements?: string | null;
  responsibilities?: string | null;
};

export type SolicitarBusquedaDeps = {
  // Invoca la función SECURITY DEFINER que valida el token y hace el insert.
  // Devuelve null si la función rechazó (token inválido/vencido).
  createRequisition: (args: {
    token: string;
    draft: RequisitionDraft;
  }) => Promise<{ requisitionId: string } | null>;
};

const clean = (s?: string | null) => (s?.trim() ? s.trim() : null);

export async function solicitarBusqueda(
  input: SolicitarBusquedaInput,
  deps: SolicitarBusquedaDeps,
): Promise<{ ok: true; data: { requisitionId: string } } | { ok: false; error: string }> {
  if (!input.token) {
    return { ok: false, error: "Enlace inválido." };
  }

  if (!REQUISITION_REASONS.includes(input.reason as RequisitionReason)) {
    return { ok: false, error: "El motivo de la solicitud no es válido." };
  }

  const title = input.title.trim();
  if (title.length < 3) {
    return { ok: false, error: "El título de la búsqueda es demasiado corto." };
  }

  const skills = input.skills?.map((s) => s.trim()).filter(Boolean) ?? [];

  const result = await deps.createRequisition({
    token: input.token,
    draft: {
      reason: input.reason as RequisitionReason,
      title,
      position: clean(input.position),
      jobArea: clean(input.jobArea),
      location: clean(input.location),
      modality: clean(input.modality),
      seniority: clean(input.seniority),
      employmentType: clean(input.employmentType),
      skills: skills.length ? skills : null,
      budget: clean(input.budget),
      estimatedStartDate: clean(input.estimatedStartDate),
      objectives: clean(input.objectives),
      requirements: clean(input.requirements),
      responsibilities: clean(input.responsibilities),
    },
  });

  if (!result) {
    return {
      ok: false,
      error: "No se pudo enviar la solicitud. El enlace puede haber vencido.",
    };
  }

  return { ok: true, data: result };
}
