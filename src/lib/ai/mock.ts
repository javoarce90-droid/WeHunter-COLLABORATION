import type {
  AiProvider,
  ScoreApplicationInput,
  ScoreApplicationResult,
  DraftOfferInput,
  DraftJobPostingInput,
  DraftJobOfferInput,
  DraftJobOffer,
  DraftScreeningQuestionsInput,
  DraftScreeningQuestion,
  DraftCandidateProfileInput,
  DraftCandidateProfile,
  InterviewGuideInput,
  ReportInsightsInput,
} from "./provider";

/**
 * Proveedor de IA mock: determinístico (mismo input → mismo output), sin modelo real ni red.
 * Suficiente para que la experiencia de IA sea real (scores persistidos, paneles ✦) y quede
 * lista para enchufar un modelo detrás de la interfaz AiProvider.
 */

/** Hash estable y chico de un string (FNV-1a). Determinístico, sin Math.random. */
function stableHash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return Math.abs(h);
}

const norm = (s: string) => s.trim().toLowerCase();

export class MockAiProvider implements AiProvider {
  async scoreApplication(input: ScoreApplicationInput): Promise<ScoreApplicationResult> {
    const { candidate, job } = input;
    const jobSkills = (job.skills ?? []).map(norm).filter(Boolean);
    const candSkills = (candidate.skills ?? []).map(norm).filter(Boolean);

    const redFlags: string[] = [];

    let score: number;
    let matched = 0;
    if (jobSkills.length > 0 && candSkills.length > 0) {
      matched = jobSkills.filter((s) => candSkills.includes(s)).length;
      // 35–95 según solapamiento de skills con la búsqueda.
      score = 35 + Math.round((matched / jobSkills.length) * 60);
      if (matched === 0) redFlags.push("Sin skills coincidentes con la búsqueda");
    } else {
      // Sin skills para comparar: score medio, marcado como dato insuficiente.
      score = 55;
      redFlags.push("Faltan skills para evaluar el match");
    }

    if (candidate.summary) score += 3;
    if (candidate.source === "referral") score += 5;
    if (!candidate.hasCv) redFlags.push("Sin CV cargado");

    // Jitter determinístico por candidato para desempatar perfiles equivalentes.
    score += stableHash(candidate.id) % 5;
    score = Math.max(5, Math.min(99, score));

    const role = job.position?.trim() || job.title;
    const summary =
      jobSkills.length > 0 && candSkills.length > 0
        ? `Coincide en ${matched} de ${jobSkills.length} skills clave de ${role}.`
        : `Match estimado para ${role} con datos limitados del perfil.`;

    // Sin dato duro para seniority/idiomas/ubicación (no hay columnas para eso en el input):
    // jitter determinístico por candidato, distinto seed por categoría para que no calquen el
    // mismo número entre sí. Mismo criterio que `score`: juicio de la IA, no medición exacta.
    const h1 = stableHash(candidate.id);
    const h2 = stableHash(`${candidate.id}:loc`);
    const skillsTecnicos =
      jobSkills.length > 0 ? Math.max(20, Math.round((matched / jobSkills.length) * 100)) : 50;
    const experiencia = candidate.summary ? 70 + (h1 % 20) : 40 + (h1 % 20);
    const seniority = 50 + (candSkills.length >= 3 ? 15 : 0) + ((h1 % 20) - 10);
    const idiomas = 55 + (h2 % 30);
    const ubicacion = 60 + (h1 % 25);
    const clamp = (n: number) => Math.max(10, Math.min(100, n));

    const strengths: string[] = [];
    if (matched > 0) strengths.push(`Domina ${matched} de las ${jobSkills.length} skills clave pedidas`);
    if (candidate.summary) strengths.push("Tiene experiencia relevante documentada en su perfil");
    if (candidate.source === "referral") strengths.push("Llegó por referido: señal de confianza extra");
    if (strengths.length < 2) strengths.push(`Compatibilidad estimada de ${score}/100 con el puesto`);

    return {
      score,
      summary,
      redFlags,
      breakdown: {
        experiencia: clamp(experiencia),
        skillsTecnicos: clamp(skillsTecnicos),
        seniority: clamp(seniority),
        idiomas: clamp(idiomas),
        ubicacion: clamp(ubicacion),
      },
      strengths: strengths.slice(0, 4),
    };
  }

  async draftOffer(input: DraftOfferInput): Promise<string> {
    const { candidateName, jobTitle, salary } = input;
    const firstName = candidateName.split(" ")[0] || candidateName;
    const salaryLine = salary
      ? `La propuesta económica es de ${salary}, acorde a tu experiencia y al mercado.`
      : "La propuesta económica la conversamos en la próxima instancia.";

    return (
      `Hola ${firstName},\n\n` +
      `Tras conocerte durante el proceso, nos entusiasma ofrecerte la posición de ${jobTitle}. ` +
      `Tu perfil es un gran aporte para el equipo y estamos convencidos de que vas a crecer con nosotros.\n\n` +
      `${salaryLine}\n\n` +
      `Quedamos atentos a tus comentarios para coordinar los próximos pasos. ¡Esperamos sumarte!`
    );
  }

  async draftJobPosting(input: DraftJobPostingInput): Promise<string> {
    const { title, skills, seniority, location, modality } = input;
    const ctx = [seniority, modality, location].filter(Boolean).join(" · ");
    const skillsLine =
      skills.length > 0
        ? `Buscamos a alguien con experiencia en ${skills.join(", ")}.`
        : "Buscamos a alguien con sólida experiencia técnica en el área.";

    return (
      `${title}${ctx ? ` — ${ctx}` : ""}\n\n` +
      `Estamos sumando a nuestro equipo un/a ${title}. ${skillsLine}\n\n` +
      `Qué ofrecemos:\n` +
      `• Un equipo que valora la autonomía y el aprendizaje continuo.\n` +
      `• Proyectos desafiantes con impacto real.\n` +
      `${modality ? `• Modalidad ${modality.toLowerCase()}.\n` : ""}` +
      `\n¿Te interesa? Postulate y conversemos.`
    );
  }

  async draftJobOffer(input: DraftJobOfferInput): Promise<DraftJobOffer> {
    const { name, brief, modality, seniority, workDay } = input;
    const position = name.trim() || "Nuevo puesto";
    const ctx = [seniority, modality, workDay].filter(Boolean).join(" · ");
    const briefLine = brief.trim()
      ? brief.trim()
      : "Buscamos sumar talento a nuestro equipo.";

    // Derivación determinística de skills desde el brief/nombre (palabras significativas).
    const skills = Array.from(
      new Set(
        `${name} ${brief}`
          .toLowerCase()
          .split(/[^a-záéíóúñ0-9+#.]+/i)
          .map((w) => w.trim())
          .filter((w) => w.length >= 3),
      ),
    ).slice(0, 6);

    return {
      position,
      jobArea: null,
      // Sin heading propio: la UI ya muestra el título de cada sección (Objetivos/Requisitos/
      // Responsabilidades) antes de este contenido — un "## Título" acá lo duplicaba.
      objectives:
        `- Aportar al equipo desde el rol de ${position}.\n` +
        `- ${briefLine}\n`,
      requirements:
        `- Experiencia previa relevante para el puesto${ctx ? ` (${ctx})` : ""}.\n` +
        (skills.length ? `- Conocimientos en ${skills.join(", ")}.\n` : "") +
        `- Buena comunicación y trabajo en equipo.\n`,
      responsibilities:
        `- Ejecutar las tareas principales del rol de ${position}.\n` +
        `- Colaborar con las distintas áreas para cumplir los objetivos.\n`,
      benefits: [
        { name: "Trabajo flexible", description: "Modalidad acordada y horarios flexibles." },
        { name: "Crecimiento", description: "Plan de desarrollo y aprendizaje continuo." },
      ],
      vacancies: 1,
      skills,
    };
  }

  async draftScreeningQuestions(
    input: DraftScreeningQuestionsInput,
  ): Promise<DraftScreeningQuestion[]> {
    const skill = input.skills?.[0] ?? null;
    return [
      {
        label: `¿Cuántos años de experiencia tenés en un rol como "${input.title.trim() || "este"}"?`,
        type: "number",
        isCriterion: true,
        minValue: 2,
        maxValue: null,
      },
      {
        label: "¿Tenés disponibilidad para incorporarte en las próximas semanas?",
        type: "yes_no",
        isCriterion: true,
        expectedValues: ["Sí"],
      },
      ...(skill
        ? [
            {
              label: `¿Cuál es tu nivel de experiencia con ${skill}?`,
              type: "multiple_choice",
              options: ["Básico", "Intermedio", "Avanzado"],
              isCriterion: false,
            } satisfies DraftScreeningQuestion,
          ]
        : []),
      {
        label: "Contanos brevemente por qué te interesa esta búsqueda.",
        type: "text",
        isCriterion: false,
      },
    ];
  }

  async draftCandidateProfile(
    input: DraftCandidateProfileInput,
  ): Promise<DraftCandidateProfile> {
    // Sin modelo real no hay forma de leer el PDF ni el contenido de LinkedIn: placeholder
    // determinístico, listo para revisar/editar. Los arrays quedan vacíos (no hay parseo real).
    return {
      fullName: null,
      phone: null,
      headline: "Perfil de talento",
      location: null,
      linkedinUrl: input.linkedinUrl?.trim() || null,
      summary: "Sin resumen disponible.",
      skills: [],
      workExperiences: [],
      education: [],
      certifications: [],
      linkedinFetchStatus: input.linkedinUrl ? "ok" : undefined,
    };
  }

  async interviewGuide(input: InterviewGuideInput): Promise<string[]> {
    const { candidateName, jobTitle, skills } = input;
    const first = candidateName.split(" ")[0] || candidateName;
    const base = [
      `Contanos sobre tu experiencia más relevante para el rol de ${jobTitle}.`,
      `¿Qué te motivó a postularte a esta búsqueda, ${first}?`,
      `Describí un problema técnico difícil que hayas resuelto y cómo lo encaraste.`,
      `¿Cómo trabajás en equipo cuando hay opiniones encontradas?`,
      `¿Qué esperás de tu próximo desafío profesional?`,
    ];
    const skillQs = skills
      .slice(0, 3)
      .map((s) => `Profundicemos en ${s}: contame un caso concreto donde lo aplicaste.`);
    return [...base.slice(0, 3), ...skillQs, ...base.slice(3)];
  }

  async reportInsights(input: ReportInsightsInput): Promise<string> {
    const { jobTitle, total, hired, timeToHireDays, topSource } = input;
    if (total === 0) {
      return `Todavía no hay datos suficientes de ${jobTitle} para generar insights.`;
    }
    const conversion = Math.round((hired / total) * 100);
    const parts = [
      `La búsqueda de ${jobTitle} acumula ${total} postulación${total !== 1 ? "es" : ""}` +
        (hired > 0 ? `, con ${hired} contratación${hired !== 1 ? "es" : ""} (${conversion}% de conversión).` : ", sin contrataciones aún."),
    ];
    if (timeToHireDays != null) {
      parts.push(`El time-to-hire promedio es de ${timeToHireDays} días.`);
    }
    if (topSource) {
      parts.push(`La fuente que más candidatos aporta es ${topSource}; conviene reforzarla.`);
    }
    if (hired === 0 && total >= 5) {
      parts.push("Sugerencia: revisá las etapas con más caída en el funnel para destrabar el proceso.");
    }
    return parts.join(" ");
  }
}
