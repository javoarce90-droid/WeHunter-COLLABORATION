/**
 * Caso de uso: un Cliente sin cuenta pide un borrador de la JD con IA (§17 backlog, Trello [70]).
 *
 * Igual que `solicitarBusqueda`, no hay usuario ni organización en contexto: la autorización es
 * el token del share, que se valida ANTES de gastar una llamada al modelo. El borrador no se
 * persiste — vuelve al form para que el Cliente lo revise y edite antes de enviar la solicitud.
 */

export type BorradorSolicitud = {
  position: string;
  jobArea: string | null;
  skills: string[];
  objectives: string;
  requirements: string;
  responsibilities: string;
};

export type SugerirSolicitudInput = {
  token: string;
  title: string;
  brief: string;
  modality?: string | null;
  seniority?: string | null;
  employmentType?: string | null;
};

export type SugerirSolicitudDeps = {
  /** true si el token existe, no está revocado y no venció. */
  tokenEsValido: (token: string) => Promise<boolean>;
  generarBorrador: (input: {
    name: string;
    brief: string;
    modality: string | null;
    seniority: string | null;
    workDay: string | null;
  }) => Promise<BorradorSolicitud>;
  /** Valida el slug de área contra el catálogo; el modelo puede devolver uno que no existe. */
  esAreaValida: (area: string | null) => boolean;
};

export async function sugerirSolicitud(
  input: SugerirSolicitudInput,
  deps: SugerirSolicitudDeps,
): Promise<{ ok: true; data: BorradorSolicitud } | { ok: false; error: string }> {
  if (!input.token) {
    return { ok: false, error: "Enlace inválido." };
  }

  const title = input.title.trim();
  if (title.length < 3) {
    return { ok: false, error: "Cargá el título de la búsqueda primero." };
  }

  const brief = input.brief.trim();
  if (!brief) {
    return { ok: false, error: "Contanos en una línea qué perfil necesitás." };
  }

  if (!(await deps.tokenEsValido(input.token))) {
    return { ok: false, error: "El enlace puede haber vencido." };
  }

  const draft = await deps.generarBorrador({
    name: title,
    brief,
    modality: input.modality?.trim() || null,
    seniority: input.seniority?.trim() || null,
    workDay: input.employmentType?.trim() || null,
  });

  return {
    ok: true,
    data: {
      position: draft.position,
      jobArea: deps.esAreaValida(draft.jobArea) ? draft.jobArea : null,
      skills: draft.skills.map((s) => s.trim()).filter(Boolean),
      objectives: draft.objectives,
      requirements: draft.requirements,
      responsibilities: draft.responsibilities,
    },
  };
}
