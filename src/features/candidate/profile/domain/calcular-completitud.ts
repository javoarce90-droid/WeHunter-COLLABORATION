export interface CompletitudProfile {
  headline: string | null;
  bio: string | null;
  location: string | null;
  phone: string | null;
  cvUrl: string | null;
  skills: string[] | null;
}

export interface CompletitudResume {
  experiences: unknown[];
  education: unknown[];
  certifications: unknown[];
  languages: unknown[];
}

function filled(value: string | null): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

export function calcularCompletitud(
  profile: CompletitudProfile,
  resume: CompletitudResume,
): { percent: number; faltantes: string[] } {
  const perfilCampos = [profile.headline, profile.bio, profile.location, profile.phone, profile.cvUrl];
  const perfilFraccion = perfilCampos.filter(filled).length / perfilCampos.length;

  const secciones = [
    { label: "experiencia", peso: 31, completa: resume.experiences.length > 0 },
    { label: "skills", peso: 16, completa: (profile.skills?.length ?? 0) > 0 },
    { label: "educación", peso: 11, completa: resume.education.length > 0 },
    { label: "idiomas", peso: 10, completa: resume.languages.length > 0 },
    { label: "certificaciones", peso: 6, completa: resume.certifications.length > 0 },
    { label: "tu perfil profesional", peso: 26 * (1 - perfilFraccion), completa: perfilFraccion >= 1 },
  ];

  const puntaje =
    perfilFraccion * 26 +
    secciones.slice(0, 5).reduce((acc, s) => acc + (s.completa ? s.peso : 0), 0);

  const faltantes = secciones
    .filter((s) => !s.completa)
    .sort((a, b) => b.peso - a.peso)
    .map((s) => s.label);

  return { percent: Math.round(puntaje), faltantes };
}
