import { REQUISITION_REASONS, type RequisitionDraft, type RequisitionReason } from "./solicitar-busqueda";

/**
 * Caso de uso: el Cliente sin cuenta edita una solicitud que sigue `pending` (§17 backlog,
 * detalle/edición). Mismas reglas de contenido que `solicitarBusqueda` — se edita, no se
 * inventan reglas nuevas. El guard de estado ("solo si sigue pendiente") vive en la función
 * SQL, no acá: no hay contexto de usuario, y la carrera "el recruiter la revisó mientras el
 * cliente editaba" solo se puede resolver de forma atómica en la base.
 */

export type EditarSolicitudInput = {
  token: string;
  requisitionId: string;
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

export type EditarSolicitudDeps = {
  // Invoca la función SECURITY DEFINER que valida token + estado y hace el update.
  // `false` = no se pudo (token inválido, solicitud de otro cliente, o ya no está pending).
  updateRequisition: (args: { token: string; requisitionId: string; draft: RequisitionDraft }) => Promise<boolean>;
};

const clean = (s?: string | null) => (s?.trim() ? s.trim() : null);

export async function editarSolicitud(
  input: EditarSolicitudInput,
  deps: EditarSolicitudDeps,
): Promise<{ ok: true } | { ok: false; error: string }> {
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

  const ok = await deps.updateRequisition({
    token: input.token,
    requisitionId: input.requisitionId,
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

  if (!ok) {
    return {
      ok: false,
      error: "No se pudo guardar. La solicitud puede haber sido revisada mientras tanto.",
    };
  }

  return { ok: true };
}
