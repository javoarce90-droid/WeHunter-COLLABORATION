import type {
  ScoreApplicationInput,
  DraftOfferInput,
  DraftJobPostingInput,
  InterviewGuideInput,
  ReportInsightsInput,
} from "./provider";

/**
 * Prompts de la IA, en UN solo lugar y SIN acoplar a ningún proveedor. Cada función recibe el
 * input tipado y devuelve { system, user }. Editar el comportamiento de la IA = editar acá; no se
 * toca la lógica de transporte (SDK, parsing, fallback) de cada provider.
 *
 * `system` fija rol/tono. `user` es el contenido concreto del pedido. Cualquier provider (Gemini,
 * OpenAI, etc.) consume estos mismos textos.
 */

export type Prompt = { system: string; user: string };

const list = (xs: string[] | null | undefined, fallback: string) =>
  xs && xs.length > 0 ? xs.join(", ") : fallback;

export const prompts = {
  scoreApplication({ candidate, job }: ScoreApplicationInput): Prompt {
    return {
      system:
        "Sos un reclutador técnico senior. Evaluás compatibilidad candidato↔búsqueda de forma " +
        "objetiva y concisa, en español rioplatense. Penalizá la falta de skills clave o de CV.",
      user:
        `Búsqueda: ${job.title}\n` +
        `Skills requeridas: ${list(job.skills, "no especificadas")}\n\n` +
        `Candidato:\n` +
        `- Skills: ${list(candidate.skills, "no especificadas")}\n` +
        `- Resumen: ${candidate.summary ?? "sin resumen"}\n` +
        `- Fuente: ${candidate.source ?? "desconocida"}\n` +
        `- CV cargado: ${candidate.hasCv ? "sí" : "no"}\n\n` +
        `Evaluá la compatibilidad del candidato con la búsqueda.`,
    };
  },

  draftOffer({ candidateName, jobTitle, salary }: DraftOfferInput): Prompt {
    return {
      system:
        "Sos un reclutador que redacta cartas de oferta laboral en español rioplatense: cálidas, " +
        "profesionales y concretas. Devolvé solo el cuerpo del mensaje, sin asunto ni firma.",
      user:
        `Redactá una oferta para ${candidateName} para el puesto de ${jobTitle}.` +
        (salary
          ? ` Propuesta económica: ${salary}.`
          : " La remuneración se conversa en la próxima instancia."),
    };
  },

  draftJobPosting({ title, skills, seniority, location, modality }: DraftJobPostingInput): Prompt {
    const ctx = [seniority, modality, location].filter(Boolean).join(" · ");
    return {
      system:
        "Sos un especialista en employer branding que redacta avisos de empleo atractivos y claros " +
        "en español rioplatense. Devolvé solo el texto del aviso, listo para publicar.",
      user:
        `Redactá el aviso público para la búsqueda "${title}"${ctx ? ` (${ctx})` : ""}.` +
        (skills.length > 0 ? ` Skills buscadas: ${skills.join(", ")}.` : ""),
    };
  },

  interviewGuide({ candidateName, jobTitle, skills }: InterviewGuideInput): Prompt {
    return {
      system:
        "Sos un entrevistador experto. Generás preguntas abiertas, mezcla de técnicas y " +
        "comportamentales, en español rioplatense.",
      user:
        `Generá una guía de preguntas para entrevistar a ${candidateName} ` +
        `para el puesto de ${jobTitle}.` +
        (skills.length > 0 ? ` Skills relevantes: ${skills.join(", ")}.` : ""),
    };
  },

  reportInsights({ jobTitle, total, hired, timeToHireDays, topSource }: ReportInsightsInput): Prompt {
    return {
      system:
        "Sos un analista de reclutamiento. Resumís el rendimiento de una búsqueda con insights " +
        "accionables, en 2–4 frases, en español rioplatense. Sin saludos ni viñetas.",
      user:
        `Búsqueda: ${jobTitle}\n` +
        `Postulaciones: ${total}\n` +
        `Contrataciones: ${hired}\n` +
        `Time-to-hire (días): ${timeToHireDays ?? "sin dato"}\n` +
        `Fuente principal: ${topSource ?? "sin dato"}`,
    };
  },
};
