import { perfilListoParaPostular } from "./perfil-minimo";

export type ScreeningAnswerInput = { questionId: string; value: string };

export type PostularDesdeCareerSiteInput = {
  jobId: string;
  fullName: string;
  email: string;
  phone?: string;
  location?: string;
  coverNote?: string;
  cvPath?: string;
  expectedSalary?: number;
  expectedSalaryCurrency?: string;
  screeningAnswers?: ScreeningAnswerInput[];
};

export type ApplyOutcome =
  | { ok: true; data: { applicationId: string; candidateId: string } }
  | { ok: false; reason: "screening"; faltantes: string }
  | { ok: false; reason: "unavailable" };

export type PostularDesdeCareerSiteDeps = {
  // Invoca la función SECURITY DEFINER apply_to_career_site_job, que valida job abierto +
  // Career Site habilitado, enlaza o crea el candidato (por email, "enlazar no duplicar"),
  // exige respuesta en las preguntas obligatorias, y crea la postulación + sus respuestas.
  applyToJob: (args: {
    jobId: string;
    fullName: string;
    email: string;
    phone: string | null;
    coverNote: string | null;
    cvPath: string | null;
    expectedSalary: number | null;
    expectedSalaryCurrency: string | null;
    screeningAnswers: ScreeningAnswerInput[];
  }) => Promise<ApplyOutcome>;
};

/**
 * Caso de uso: postularse a una búsqueda, desde el Career Site público o desde el portal del
 * candidato (los dos flujos pasan por acá).
 *
 * No hay contexto de rol/organization (el postulante no es miembro de ninguna org) — la
 * autorización real vive en la función definer, igual que registrarFeedback delega en
 * submit_shortlist_feedback. Acá se valida forma y se traduce el rechazo a un mensaje.
 *
 * Las preguntas obligatorias las exige la función definer, no este caso de uso: es el único
 * punto por el que pasan los dos flujos y el único que tiene las preguntas reales de la
 * búsqueda (el cliente podría mandar menos respuestas de las que hay).
 */
export async function postularDesdeCareerSite(
  input: PostularDesdeCareerSiteInput,
  deps: PostularDesdeCareerSiteDeps,
): Promise<
  | { ok: true; data: { applicationId: string } }
  | { ok: false; reason: "perfil-incompleto"; faltantes: string[]; error: string }
  | { ok: false; error: string }
> {
  const fullName = input.fullName.trim();
  if (!fullName) {
    return { ok: false, error: "Ingresá tu nombre." };
  }

  const perfil = perfilListoParaPostular({
    fullName,
    email: input.email.trim(),
    phone: input.phone?.trim() || null,
    location: input.location?.trim() || null,
    cvUrl: input.cvPath?.trim() || null,
  });
  if (!perfil.ok) {
    return {
      ok: false,
      reason: "perfil-incompleto",
      faltantes: perfil.faltantes,
      error: `Completá estos datos de tu perfil antes de postularte: ${perfil.faltantes.join(", ")}.`,
    };
  }

  const result = await deps.applyToJob({
    jobId: input.jobId,
    fullName,
    email: input.email.trim(),
    phone: input.phone?.trim() || null,
    coverNote: input.coverNote?.trim() || null,
    cvPath: input.cvPath?.trim() || null,
    expectedSalary: input.expectedSalary ?? null,
    expectedSalaryCurrency: input.expectedSalaryCurrency?.trim() || null,
    screeningAnswers: (input.screeningAnswers ?? []).filter((a) => a.value.trim()),
  });

  if (!result.ok) {
    if (result.reason === "screening") {
      return {
        ok: false,
        error: `Respondé las preguntas obligatorias antes de postularte: ${result.faltantes}.`,
      };
    }
    return {
      ok: false,
      error:
        "No se pudo enviar la postulación. Puede que ya te hayas postulado o que la búsqueda ya no esté disponible.",
    };
  }

  return { ok: true, data: { applicationId: result.data.applicationId } };
}
