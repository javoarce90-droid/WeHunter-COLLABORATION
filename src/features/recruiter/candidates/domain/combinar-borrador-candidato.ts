import type {
  DraftCandidateProfile,
  DraftWorkExperience,
  DraftEducation,
  DraftCertification,
} from "@/lib/ai";

/**
 * "Actualizar perfil con IA": combina un candidato que YA existe en el pool con el borrador
 * que la IA extrajo de un CV/LinkedIn nuevo. La regla es **rellenar lo que falta, nunca pisar
 * lo que ya hay**: un campo plano cargado gana siempre sobre el de la IA; las skills se unen; y
 * de experiencia/educación/certificaciones solo se suman los items que el candidato todavía no
 * tiene (match laxo por nombre). El recruiter revisa todo en el formulario antes de guardar —
 * esto solo arma el punto de partida.
 *
 * Función pura (mismo criterio que `normalizeCandidateDetails`): la autorización y la
 * persistencia viven en la action y en `editarCandidato`.
 */

/** Lo mínimo del candidato actual que necesita el merge (los items de currículum solo para
 *  deduplicar — no hace falta traer fechas ni descripciones). */
export interface CandidatoParaCombinar {
  headline: string | null;
  location: string | null;
  linkedinUrl: string | null;
  summary: string | null;
  phone: string | null;
  email: string | null;
  skills: string[] | null;
  experiencias: { company: string; position: string }[];
  educacion: { institution: string; degree: string }[];
  certificaciones: { name: string }[];
}

export interface BorradorCombinado {
  /** Campos planos ya combinados (existente ?? IA). Se pasan como defaults del formulario. */
  campos: {
    headline: string | null;
    location: string | null;
    linkedinUrl: string | null;
    summary: string | null;
    phone: string | null;
    email: string | null;
    skills: string[];
  };
  /** Items que la IA trajo y el candidato NO tenía — se agregan al currículum. */
  nuevasExperiencias: DraftWorkExperience[];
  nuevaEducacion: DraftEducation[];
  nuevasCertificaciones: DraftCertification[];
  /** Resumen legible de lo que la IA aportó, para el aviso de la UI. Vacío = no sumó nada. */
  aportes: string[];
}

/** Normaliza para comparar nombres de empresa/institución/certificación: sin mayúsculas,
 *  sin espacios de más. Match laxo a propósito — evita duplicar "Google" y "google inc". */
const clave = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

const limpio = (s: string | null | undefined) => (s && s.trim() ? s.trim() : null);

function plural(n: number, singular: string, plural: string): string {
  return `${n} ${n === 1 ? singular : plural}`;
}

export function combinarBorradorConCandidato(
  actual: CandidatoParaCombinar,
  borrador: DraftCandidateProfile,
): BorradorCombinado {
  const aportes: string[] = [];

  // --- Campos planos: el existente gana; la IA solo rellena el vacío. ---
  function rellenar(
    existente: string | null,
    delBorrador: string | null | undefined,
    etiqueta: string,
  ): string | null {
    const yaHay = limpio(existente);
    if (yaHay) return yaHay;
    const nuevo = limpio(delBorrador);
    if (nuevo) aportes.push(etiqueta);
    return nuevo;
  }

  const headline = rellenar(actual.headline, borrador.headline, "titular");
  const location = rellenar(actual.location, borrador.location, "ubicación");
  const linkedinUrl = rellenar(actual.linkedinUrl, borrador.linkedinUrl, "LinkedIn");
  const summary = rellenar(actual.summary, borrador.summary, "resumen profesional");
  const phone = rellenar(actual.phone, borrador.phone, "teléfono");
  const email = rellenar(actual.email, borrador.email, "email");

  // --- Skills: unión, dedupe laxo, preservando el orden (primero las que ya estaban). ---
  const skillsActuales = actual.skills ?? [];
  const vistas = new Set(skillsActuales.map(clave));
  const skillsNuevas = borrador.skills.filter((s) => s.trim() && !vistas.has(clave(s)));
  const skills = [...skillsActuales, ...skillsNuevas];
  if (skillsNuevas.length > 0) aportes.push(plural(skillsNuevas.length, "skill", "skills"));

  // --- Currículum: sumar solo lo que el candidato no tiene ya. ---
  const clavesExp = new Set(
    actual.experiencias.map((e) => `${clave(e.company)}|${clave(e.position)}`),
  );
  const nuevasExperiencias = borrador.workExperiences.filter(
    (e) =>
      e.company.trim() &&
      e.position.trim() &&
      !clavesExp.has(`${clave(e.company)}|${clave(e.position)}`),
  );
  if (nuevasExperiencias.length > 0) {
    aportes.push(plural(nuevasExperiencias.length, "experiencia", "experiencias"));
  }

  const clavesEdu = new Set(
    actual.educacion.map((e) => `${clave(e.institution)}|${clave(e.degree)}`),
  );
  const nuevaEducacion = borrador.education.filter(
    (e) =>
      e.institution.trim() &&
      e.degree.trim() &&
      !clavesEdu.has(`${clave(e.institution)}|${clave(e.degree)}`),
  );
  if (nuevaEducacion.length > 0) {
    aportes.push(plural(nuevaEducacion.length, "estudio", "estudios"));
  }

  const clavesCert = new Set(actual.certificaciones.map((c) => clave(c.name)));
  const nuevasCertificaciones = borrador.certifications.filter(
    (c) => c.name.trim() && !clavesCert.has(clave(c.name)),
  );
  if (nuevasCertificaciones.length > 0) {
    aportes.push(plural(nuevasCertificaciones.length, "certificación", "certificaciones"));
  }

  return {
    campos: { headline, location, linkedinUrl, summary, phone, email, skills },
    nuevasExperiencias,
    nuevaEducacion,
    nuevasCertificaciones,
    aportes,
  };
}
