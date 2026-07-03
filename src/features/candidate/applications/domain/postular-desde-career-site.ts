export type PostularDesdeCareerSiteInput = {
  jobId: string;
  fullName: string;
  email: string;
  phone?: string;
  coverNote?: string;
  cvPath: string;
};

export type PostularDesdeCareerSiteDeps = {
  // Invoca la función SECURITY DEFINER apply_to_career_site_job, que valida job abierto +
  // Career Site habilitado, enlaza o crea el candidato (por email, "enlazar no duplicar") y
  // crea la postulación. Devuelve null si rechazó (ya postulado, búsqueda no disponible).
  applyToJob: (args: {
    jobId: string;
    fullName: string;
    email: string;
    phone: string | null;
    coverNote: string | null;
    cvPath: string;
  }) => Promise<{ applicationId: string; candidateId: string } | null>;
};

/**
 * Caso de uso: postularse a una búsqueda desde el Career Site público.
 * No hay contexto de rol/organization (el postulante no es miembro de ninguna org) — la
 * autorización real vive en la función definer, igual que registrarFeedback delega en
 * submit_shortlist_feedback. Acá solo se valida forma.
 */
export async function postularDesdeCareerSite(
  input: PostularDesdeCareerSiteInput,
  deps: PostularDesdeCareerSiteDeps,
): Promise<{ ok: true; data: { applicationId: string } } | { ok: false; error: string }> {
  const fullName = input.fullName.trim();
  if (!fullName) {
    return { ok: false, error: "Ingresá tu nombre." };
  }

  const result = await deps.applyToJob({
    jobId: input.jobId,
    fullName,
    email: input.email.trim(),
    phone: input.phone?.trim() || null,
    coverNote: input.coverNote?.trim() || null,
    cvPath: input.cvPath,
  });

  if (!result) {
    return {
      ok: false,
      error:
        "No se pudo enviar la postulación. Puede que ya te hayas postulado o que la búsqueda ya no esté disponible.",
    };
  }

  return { ok: true, data: { applicationId: result.applicationId } };
}
