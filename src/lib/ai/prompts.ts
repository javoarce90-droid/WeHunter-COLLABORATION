import type {
  ScoreApplicationInput,
  DraftOfferInput,
  DraftJobPostingInput,
  DraftJobOfferInput,
  DraftScreeningQuestionsInput,
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

/**
 * `draftCandidateProfile` recibe esto en vez del `DraftCandidateProfileInput` del provider:
 * el fetch de la URL de LinkedIn (si la hay) ya corrió antes (2 llamadas, ver gemini.ts — Gemini
 * no soporta combinar la tool de URL-context con responseSchema en la misma llamada), así que acá
 * ya solo hay texto plano resuelto.
 */
export type DraftCandidateProfilePromptInput = {
  hasCvFile: boolean;
  linkedinText: string | null;
  linkedinFetchFailed: boolean;
};

const list = (xs: string[] | null | undefined, fallback: string) =>
  xs && xs.length > 0 ? xs.join(", ") : fallback;

export const prompts = {
  scoreApplication({ candidate, job }: ScoreApplicationInput): Prompt {
    // El rol canónico es `position`; `title` es el headline. Priorizamos el puesto real.
    const role = job.position?.trim() || job.title;
    return {
      system:
        "Sos un reclutador técnico senior. Evaluás compatibilidad candidato↔búsqueda de forma " +
        "objetiva y concisa, en español rioplatense. Penalizá la falta de skills clave o de CV. " +
        "Además del score general, desglosá tu evaluación en 5 categorías (experiencia, skills " +
        "técnicos, seniority, idiomas, ubicación) y listá 2 a 4 fortalezas concretas del " +
        "candidato para este puesto puntual — si falta información para juzgar alguna " +
        "categoría (ej. idiomas o ubicación sin datos), estimala de forma conservadora en vez " +
        "de inventar certeza.",
      user:
        `Búsqueda: ${role}\n` +
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

  draftJobOffer({ name, brief, modality, seniority, workDay }: DraftJobOfferInput): Prompt {
    const ctx = [seniority, modality, workDay].filter(Boolean).join(" · ");
    return {
      system:
        "Sos un especialista en employer branding y redacción de avisos de empleo en español " +
        "rioplatense. A partir de unos pocos datos, completás una oferta de trabajo estructurada, " +
        "atractiva y realista. Devolvés SOLO un objeto JSON con los campos pedidos. Los textos " +
        "(objectives, requirements, responsibilities) van en Markdown con viñetas, SIN un título " +
        "u encabezado propio al inicio (nada de '## Objetivos del puesto' ni similar): la interfaz " +
        "ya muestra el título de cada sección, empezá directo con el contenido. No inventes " +
        "datos sensibles ni discriminatorios (nada de edad, género ni nivel educativo obligatorio).",
      user:
        `Generá una oferta de trabajo a partir de:\n` +
        `- Nombre de la publicación: "${name}"\n` +
        (ctx ? `- Contexto: ${ctx}\n` : "") +
        `- Notas del reclutador: ${brief || "sin notas adicionales"}\n\n` +
        `Devolvé: position (el puesto real a cubrir), jobArea (uno de: tecnologia, salud, ` +
        `finanzas, ventas, marketing, rrhh, operaciones, legal, educacion, ingenieria, diseno, ` +
        `atencion_cliente, otro), objectives, requirements y responsibilities (Markdown con ` +
        `viñetas), benefits (lista de {name, description}), vacancies (entero ≥1) y skills ` +
        `(lista de tecnologías/competencias clave para el matching).`,
    };
  },

  draftScreeningQuestions({
    title,
    objectives,
    requirements,
    responsibilities,
    skills,
  }: DraftScreeningQuestionsInput): Prompt {
    const contenido = [
      objectives ? `Objetivos:\n${objectives}` : null,
      requirements ? `Requisitos:\n${requirements}` : null,
      responsibilities ? `Responsabilidades:\n${responsibilities}` : null,
    ]
      .filter(Boolean)
      .join("\n\n");
    return {
      system:
        "Sos un reclutador técnico que arma preguntas de screening (las responde el candidato " +
        "al postularse, antes de la entrevista) en español rioplatense. Devolvés SOLO un array " +
        "JSON de 4 a 5 preguntas relevantes al puesto — ni genéricas ni triviales, apuntan a " +
        "filtrar por requisitos concretos del aviso. Cada pregunta tiene: label (el texto), " +
        "type (exactamente uno de: yes_no, text, number, multiple_choice), options (solo si " +
        "type=multiple_choice, 2 a 5 opciones), isCriterion (true si la respuesta debería " +
        "descalificar/priorizar al candidato), y si isCriterion=true: expectedValues (respuestas " +
        "válidas, para yes_no/multiple_choice) o minValue/maxValue (para number, al menos uno de " +
        "los dos). Reglas estrictas de coherencia, no las rompas: una pregunta type=text NUNCA " +
        "puede ser isCriterion=true (no hay forma de evaluar texto libre automáticamente). Preferí " +
        "criterios objetivos y verificables (años de experiencia, disponibilidad, certificaciones) " +
        "por sobre preferencias subjetivas. No inventes datos sensibles ni discriminatorios (nada " +
        "de edad, género, estado civil ni nivel educativo obligatorio salvo que el aviso lo pida " +
        "explícitamente).",
      user:
        `Búsqueda: "${title}"\n` +
        (skills?.length ? `Skills buscadas: ${skills.join(", ")}\n` : "") +
        (contenido ? `\n${contenido}\n` : "\n(sin más contenido cargado todavía)\n") +
        `\nSugerí las preguntas de screening para esta búsqueda.`,
    };
  },

  draftCandidateProfile({ hasCvFile, linkedinText, linkedinFetchFailed }: DraftCandidateProfilePromptInput): Prompt {
    const sources = [
      hasCvFile ? "un CV en PDF adjunto" : null,
      linkedinText ? "el texto transcripto de un perfil de LinkedIn" : null,
    ].filter(Boolean);

    return {
      system:
        "Sos un asistente que arma perfiles de talento en español rioplatense a partir de un CV " +
        "en PDF y/o un perfil de LinkedIn. Devolvés SOLO un objeto JSON con los campos pedidos, " +
        "extrayendo lo que la fuente realmente dice — no inventes experiencia, títulos, empresas, " +
        "instituciones, certificaciones ni fechas que no figuren en el material provisto. Para " +
        "`skills` (tanto el general como el de cada experiencia): nunca las infieras de " +
        "descripciones de tareas o logros; solo de una sección explícita.",
      user:
        `Extraé el perfil de esta persona a partir de ${sources.join(" y ") || "el material adjunto"}` +
        `:\n\n` +
        (linkedinText ? `Texto del perfil de LinkedIn:\n"""\n${linkedinText}\n"""\n\n` : "") +
        (linkedinFetchFailed
          ? `No se pudo obtener contenido de la URL de LinkedIn provista; ignorala por completo, ` +
            `no inventes nada a partir de ella.\n\n`
          : "") +
        `Devolvé:\n` +
        `- fullName (nombre completo de la persona tal como figura en el material, si no ` +
        `aparece con claridad, null)\n` +
        `- phone (teléfono de contacto si se menciona, si no null)\n` +
        `- headline (puesto/título actual, ej "Frontend Senior")\n` +
        `- location (ciudad/país si se menciona, si no null)\n` +
        `- linkedinUrl (si aparece una URL de linkedin.com en el material, si no null)\n` +
        `- summary (resumen breve en 2-3 frases)\n` +
        `- skills: incluí una tecnología/competencia ÚNICAMENTE si aparece dentro de una ` +
        `sección EXPLÍCITAMENTE titulada "Skills", "Habilidades", "Competencias" o ` +
        `"Tecnologías" (encabezado propio, lista de aptitudes, o la sección de Skills de ` +
        `LinkedIn). NO la infieras de descripciones de puestos, logros o texto libre, aunque ` +
        `mencionen tecnologías. Si no hay una sección así de explícita, devolvé skills: []. ` +
        `Ante la duda, dejá la lista vacía — es preferible perder una skill real a inventar ` +
        `una que no está declarada como tal.\n` +
        `- workExperiences: lista de experiencias laborales, cada una con company, position, ` +
        `startDate/endDate (formato YYYY-MM-DD; si solo se conoce mes/año usá el día 01; si no ` +
        `hay dato, null; endDate null también puede significar "trabajo actual"), description, ` +
        `employmentType (uno de: full_time, part_time, contract, internship, temporary, ` +
        `freelance, o null si no se puede inferir con confianza), modality (uno de: onsite, ` +
        `remote, hybrid, o null), y skills (misma regla estricta de arriba, pero solo si el ` +
        `material lista skills explícitas para ESE puesto puntual; si no, []).\n` +
        `- education: lista de estudios, cada uno con institution, degree, fieldOfStudy, ` +
        `startDate/endDate (mismo formato), description, grade, activities (todos null si no ` +
        `hay dato).\n` +
        `- certifications: lista de certificaciones, cada una con name y url (null si no hay).\n\n` +
        `Si una lista no tiene ningún ítem detectable, devolvela vacía ([]). No inventes ` +
        `elementos para "completar" el perfil.`,
    };
  },

  /** Llamada previa (sin responseSchema) que intenta transcribir un perfil de LinkedIn vía la
   * tool de URL-context de Gemini. Separada de draftCandidateProfile porque la API no acepta
   * combinar tools con responseSchema en el mismo pedido. */
  fetchLinkedinProfile(linkedinUrl: string): Prompt {
    return {
      system:
        "Tenés acceso a una tool para leer contenido de una URL. Transcribís en texto plano " +
        "todo el contenido visible de un perfil de LinkedIn, sin resumir ni interpretar.",
      user:
        `Leé este perfil de LinkedIn y transcribí en texto plano todo su contenido visible ` +
        `(titular, ubicación, acerca de, experiencia, educación, certificaciones, y la sección ` +
        `de Skills si existe): ${linkedinUrl}`,
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
