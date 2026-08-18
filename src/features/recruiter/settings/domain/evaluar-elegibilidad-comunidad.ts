export type RequisitoComunidad = {
  campo: "fullName" | "jobTitle" | "bio";
  label: string;
  cumplido: boolean;
};

export type ElegibilidadComunidad = {
  /** true si cumple los 3 requisitos mínimos (no implica que el checkbox de opt-in esté
   *  activado — eso es una decisión aparte del recruiter). */
  elegible: boolean;
  requisitos: RequisitoComunidad[];
  faltantes: string[];
};

/** Requisitos mínimos para que un perfil sea elegible para la Comunidad WeHunter — reflejan
 *  el filtro real de la base (ver migración 0102/0104/0105: "el perfil solo es elegible si
 *  completó nombre + título profesional + bio"). El rol (owner/admin/recruiter/consultant) y
 *  el opt-in (`visible_in_community`) se resuelven aparte, no acá — esto es solo lo que el
 *  recruiter puede completar desde su perfil. */
export function evaluarElegibilidadComunidad(profile: {
  fullName: string | null;
  jobTitle: string | null;
  bio: string | null;
}): ElegibilidadComunidad {
  const requisitos: RequisitoComunidad[] = [
    { campo: "fullName", label: "Nombre completo", cumplido: Boolean(profile.fullName?.trim()) },
    { campo: "jobTitle", label: "Título profesional", cumplido: Boolean(profile.jobTitle?.trim()) },
    { campo: "bio", label: "Bio", cumplido: Boolean(profile.bio?.trim()) },
  ];
  const faltantes = requisitos.filter((r) => !r.cumplido).map((r) => r.label);
  return { elegible: faltantes.length === 0, requisitos, faltantes };
}
