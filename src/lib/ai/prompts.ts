import type {
  ScoreApplicationInput,
  DraftOfferInput,
  DraftJobPostingInput,
  DraftJobOfferInput,
  DraftScreeningQuestionsInput,
  InterviewGuideInput,
  ReportInsightsInput,
  InterviewReportInput,
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
  /** Texto de un CV ya extraído (ej. `.docx`). Va embebido en el prompt, como `linkedinText`. */
  cvText: string | null;
  linkedinText: string | null;
  linkedinFetchFailed: boolean;
};

const list = (xs: string[] | null | undefined, fallback: string) =>
  xs && xs.length > 0 ? xs.join(", ") : fallback;

const listExperience = (
  xs: ScoreApplicationInput["candidate"]["experience"],
) =>
  xs.length > 0
    ? xs
        .map(
          (e) =>
            `  · ${e.position} en ${e.company}${e.description ? ` — ${e.description}` : ""}`,
        )
        .join("\n")
    : "  (sin experiencia cargada)";

const listEducation = (xs: ScoreApplicationInput["candidate"]["education"]) =>
  xs.length > 0
    ? xs
        .map(
          (e) =>
            `  · ${e.degree} — ${e.institution}${e.fieldOfStudy ? ` (${e.fieldOfStudy})` : ""}`,
        )
        .join("\n")
    : "  (sin educación cargada)";

/**
 * Ejemplo "gold" (few-shot) para `draftJobOffer`: un aviso real y bien escrito que fija el
 * listón de calidad. El modelo generaliza desde acá — un mal ejemplo envenena TODAS las
 * generaciones, así que el detalle acá importa.
 *
 * Basado en un aviso real de Analista Funcional Sr aportado por el cliente (2026-08-31),
 * condensado al formato de salida (position / jobArea / objectives / requirements /
 * responsibilities / skills / benefits). Un solo ejemplo alcanza: es un puesto no puramente
 * técnico y con secciones ricas, buen molde para que el modelo NO sobreajuste a roles de dev.
 */
const JOB_OFFER_GOLD_EXAMPLE = `Puesto: Analista Funcional Senior · Área: tecnologia

Objetivos:
- Ser el nexo entre negocio, desarrollo y QA, traduciendo necesidades en definiciones claras y accionables.
- Asegurar la calidad de la entrega acompañando cada historia de usuario de punta a punta, de la definición a la aprobación funcional.
- Aportar valor desde el análisis: cuestionar, proponer y mejorar la calidad de las soluciones, no solo documentar.

Requisitos:
- 3 a 5 años de experiencia comprobable como Analista Funcional Senior.
- Experiencia real redactando historias de usuario completas (contexto funcional, reglas de negocio, impacto en el modelo de datos, criterios de aceptación testeables).
- SQL sólido: queries con múltiples joins, inserts/updates y análisis de datos; capacidad de entender e impactar en el modelo de datos.
- Formación en Sistemas (Ingeniería, Licenciatura o Analista).
- Deseable: experiencia en turismo, C#, ASP.NET, React y metodologías ágiles (Scrum/Kanban) con Jira o Azure DevOps.

Responsabilidades:
- Adquirir rápidamente conocimiento del negocio, los procesos y los sistemas existentes.
- Relevar y analizar necesidades de clientes internos y externos, y definir si requieren solución operativa o desarrollo evolutivo.
- Redactar historias de usuario de punta a punta, con reglas de negocio, detalle técnico (modelo de datos, queries si aplica), mockups y criterios de aceptación claros.
- Dar seguimiento a cada historia durante todo su ciclo de vida y validar funcionalmente los desarrollos, otorgando la aprobación final.
- Trabajar con desarrollo y QA para asegurar la correcta implementación y detectar oportunidades de mejora en procesos y entregables.

Skills: SQL, Modelado de datos, Historias de usuario, Criterios de aceptación, Análisis funcional, Scrum, Kanban, Jira, Azure DevOps, C#

Beneficios:
- Prepaga de primer nivel: cobertura médica premium para vos y tu grupo familiar.
- Modalidad híbrida: presencial una vez cada 15 días, el resto remoto.
- Día de cumpleaños libre y snacks y frutas en la oficina.
- Impacto real: trabajo sobre producto propio, con participación en las decisiones y la evolución del producto.`;

/**
 * Ejemplo "gold" (few-shot) para `interviewReport`: notas de entrevista reales → informe bien
 * armado. Fija el nivel de extracción (cada dato de las notas aparece en el informe) y de
 * redacción (profesional, sin relleno, sin inventar). Basado en un informe real aportado por
 * el cliente (2026-08-31), condensado a los campos que devuelve la IA hoy (ubicacion /
 * remuneracionPretendida / disponibilidad / resumen / fortalezas / aspectosAValidar /
 * recommendation / recommendationJustification).
 */
const INTERVIEW_REPORT_GOLD_EXAMPLE = `EJEMPLO (notas → informe). Seguí este nivel de detalle y de fidelidad al texto; NO copies el contenido.

NOTAS DE ENTREVISTA:
"""
Alejandro Del Vecchio, dev fullstack. Vive en San Martín. Tecnicatura en Programación (UNSAM). Inglés avanzado.
Dev .NET con paso por Accenture (2016-2021), Celerative (2020-2021) y CloudX (2021-2023). Fuerte en C#, .NET, SQL Server, MVC, ASP, Web Forms, JS, JQuery, Azure DevOps. Siempre trabajó en Scrum, en equipos con devs, líder y QA. En CloudX hizo migración de apps y features nuevas; salió por fin de proyecto.
Desde enero 2023 sin trabajar: hizo cursos de React y Node.js. Está en búsqueda activa pero sin procesos avanzados. Quiere seguir en .NET y sumar React.
Última remu USD 3.500. Pretensión conversable, con ganas de avanzar con la oportunidad. Disponibilidad de ingreso inmediata. Para entrevistas: lunes a viernes antes de las 14 h.
Fortalezas que menciona: flexibilidad, orientación a resultados, capacidad analítica. Oportunidad de mejora: pedir ayuda a tiempo.
"""

INFORME:
- ubicacion: "San Martín, Provincia de Buenos Aires"
- remuneracionPretendida: "Conversable; manifestó interés en avanzar con la oportunidad. Última remuneración informada: USD 3.500."
- disponibilidad: "Ingreso inmediato. Disponibilidad para entrevistas: lunes a viernes antes de las 14 h."
- resumen: "Desarrollador .NET con trayectoria en Accenture, Celerative y CloudX, concentrada en desarrollo de nuevas funcionalidades, mantenimiento y migración de aplicaciones con C#, .NET y SQL Server. Trabajó siempre bajo Scrum, en equipos con desarrolladores, liderazgo y QA. Desde enero de 2023 no registra experiencia laboral; durante ese período realizó cursos de React y Node.js. Se encuentra en búsqueda activa, sin procesos avanzados, con interés en continuar como desarrollador .NET y ampliar su stack hacia React."
- fortalezas: ["Experiencia previa y sostenida en el ecosistema .NET/C#", "Experiencia con SQL Server y con desarrollo, mantenimiento y migración de aplicaciones", "Trabajo previo bajo Scrum en equipos técnicos multidisciplinarios", "Interés activo en ampliar su stack hacia React", "Menciona flexibilidad, orientación a resultados y capacidad analítica como fortalezas propias"]
- aspectosAValidar: ["Nivel técnico actual en C#/.NET tras el período sin experiencia laboral registrada desde enero de 2023", "Profundidad práctica de los conocimientos en React y Node.js adquiridos mediante cursos", "Ajuste del perfil al seniority y a los requerimientos técnicos específicos de la vacante Fullstack"]
- recommendation: "continuar_evaluando"
- recommendationJustification: "El perfil presenta experiencia relevante y sostenida en el ecosistema .NET (C#, SQL Server, metodologías ágiles), por lo que se recomienda continuar el proceso. Antes de definir la adecuación final a la vacante conviene una instancia técnica que valide el nivel actual de sus conocimientos y el alcance práctico de React, así como su ajuste al seniority requerido."`;

/** Instrucción de sistema compartida por `scoreApplication` (1 candidato) y
 *  `scoreApplicationsBatch` (N candidatos de una) — el criterio de evaluación es el mismo. */
const SCORE_SYSTEM =
  "Sos un reclutador técnico senior. Evaluás compatibilidad candidato↔búsqueda de forma " +
  "objetiva y concisa, en español rioplatense, comparando SOLO dos cosas: lo que pide la " +
  "búsqueda (skills, objetivos, requisitos, responsabilidades) contra el perfil del " +
  "candidato (skills, experiencia, educación). NUNCA penalices por falta de CV cargado — " +
  "no es una señal de compatibilidad, es un detalle de carga de datos. Si el perfil del " +
  "candidato está vacío o tiene muy poca información para evaluar el match (sin skills, " +
  "sin experiencia, sin educación), decilo explícitamente en el resumen y reflejalo en un " +
  "score más bajo por falta de datos para confirmar el match — no asumas competencia sin " +
  "evidencia. Además del score general, desglosá tu evaluación en 5 categorías " +
  "(experiencia, skills técnicos, seniority, idiomas, ubicación) y listá 2 a 4 fortalezas " +
  "concretas del candidato para este puesto puntual — si falta información para juzgar " +
  "alguna categoría (ej. idiomas o ubicación sin datos), estimala de forma conservadora en " +
  "vez de inventar certeza.";

const jobContextBlock = (job: ScoreApplicationInput["job"]) =>
  `Búsqueda: ${job.position?.trim() || job.title}\n` +
  `Skills requeridas: ${list(job.skills, "no especificadas")}\n` +
  `Objetivos: ${job.objectives?.trim() || "no especificados"}\n` +
  `Requisitos: ${job.requirements?.trim() || "no especificados"}\n` +
  `Responsabilidades: ${job.responsibilities?.trim() || "no especificadas"}\n`;

const candidateBlock = (c: ScoreApplicationInput["candidate"]) =>
  `- Skills: ${list(c.skills, "no especificadas")}\n` +
  `- Experiencia:\n${listExperience(c.experience)}\n` +
  `- Educación:\n${listEducation(c.education)}\n` +
  `- Resumen/bio: ${c.summary ?? "sin resumen"}\n` +
  `- Fuente: ${c.source ?? "desconocida"}\n`;

export const prompts = {
  scoreApplication({ candidate, job }: ScoreApplicationInput): Prompt {
    const profileIsThin =
      (!candidate.skills || candidate.skills.length === 0) &&
      candidate.experience.length === 0 &&
      candidate.education.length === 0;
    return {
      system: SCORE_SYSTEM,
      user:
        jobContextBlock(job) +
        `\nCandidato:\n` +
        candidateBlock(candidate) +
        (profileIsThin
          ? "\nOJO: el perfil de este candidato tiene muy poca información cargada — aclaralo " +
            "en el resumen y no asumas compatibilidad que no se puede confirmar con estos datos.\n"
          : "\n") +
        `Evaluá la compatibilidad del candidato con la búsqueda.`,
    };
  },

  /** Scoring en lote: un solo prompt con la búsqueda una vez + todos los candidatos, cada uno
   *  con su `candidateId`. El modelo devuelve un array de resultados emparejados por ese id. */
  scoreApplicationsBatch({
    job,
    candidates,
  }: {
    job: ScoreApplicationInput["job"];
    candidates: ScoreApplicationInput["candidate"][];
  }): Prompt {
    return {
      system:
        SCORE_SYSTEM +
        " Recibís VARIOS candidatos numerados; evaluás CADA UNO por separado con el mismo " +
        "criterio y devolvés un resultado por cada `candidateId` recibido, sin omitir ninguno " +
        "y sin inventar ids que no estén en la lista.",
      user:
        jobContextBlock(job) +
        `\nCandidatos (${candidates.length}):\n\n` +
        candidates
          .map(
            (c, i) =>
              `### candidateId: ${c.id}  (candidato ${i + 1} de ${candidates.length})\n` +
              candidateBlock(c),
          )
          .join("\n") +
        `\nEvaluá la compatibilidad de cada candidato con la búsqueda. Devolvé un array con ` +
        `un objeto por candidato, cada uno con su candidateId exacto.`,
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

  draftJobPosting({
    title,
    skills,
    seniority,
    location,
    modality,
  }: DraftJobPostingInput): Prompt {
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

  draftJobOffer({
    name,
    brief,
    modality,
    seniority,
    workDay,
  }: DraftJobOfferInput): Prompt {
    const ctx = [seniority, modality, workDay].filter(Boolean).join(" · ");
    return {
      system:
        "Sos un especialista en employer branding y redacción de avisos de empleo en español " +
        "rioplatense. Tu trabajo es INTERPRETAR y ENRIQUECER: a partir del título del puesto y " +
        "unas pocas notas, proponés las skills, requisitos, responsabilidades y objetivos " +
        "TÍPICOS de ese rol y ese seniority, aunque el reclutador no los haya escrito — él después " +
        "edita. Un aviso de plantilla genérica ('ejecutar las tareas del rol', 'buena " +
        "comunicación') es un fracaso: apuntá al nivel de detalle de un aviso real y bien escrito " +
        "de ese puesto.\n\n" +
        "Reglas duras:\n" +
        "- `skills`: SOLO tecnologías, herramientas y competencias profesionales reales y " +
        "concretas del puesto (ej. para un Data Engineer: 'Python', 'SQL', 'Airflow', 'Spark', " +
        "'dbt', 'AWS'). NUNCA uses palabras sueltas del título o del brief como skills ('data', " +
        "'engineer', 'buscamos', 'para', 'diseñar' NO son skills). Si el rol no es técnico, poné " +
        "competencias reales del rubro, no verbos genéricos.\n" +
        "- Devolvés SOLO un objeto JSON con los campos pedidos.\n" +
        "- objectives, requirements y responsibilities: Markdown con viñetas, SIN encabezado " +
        "propio al inicio (nada de '## Objetivos'): la interfaz ya muestra el título de cada " +
        "sección.\n" +
        "- No inventes datos sensibles ni discriminatorios (nada de edad, género ni nivel " +
        "educativo obligatorio salvo que el brief lo pida)." +
        (JOB_OFFER_GOLD_EXAMPLE.trim()
          ? "\n\nEjemplo del nivel de calidad esperado (adaptá el rubro y el detalle al puesto " +
            "pedido, no lo copies):\n" +
            JOB_OFFER_GOLD_EXAMPLE
          : ""),
      user:
        `Generá una oferta de trabajo a partir de:\n` +
        `- Nombre de la publicación: "${name}"\n` +
        (ctx ? `- Contexto: ${ctx}\n` : "") +
        `- Notas del reclutador: ${brief || "sin notas adicionales"}\n\n` +
        `Inferí lo que el rol "${name}" implica típicamente y completá:\n` +
        `position (el puesto real a cubrir), jobArea (uno de: tecnologia, salud, ` +
        `finanzas, ventas, marketing, rrhh, operaciones, legal, educacion, ingenieria, diseno, ` +
        `atencion_cliente, otro), objectives, requirements y responsibilities (Markdown con ` +
        `viñetas), benefits (lista de {name, description}), vacancies (entero ≥1) y skills ` +
        `(lista de tecnologías/competencias clave reales para el matching).`,
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
        (contenido
          ? `\n${contenido}\n`
          : "\n(sin más contenido cargado todavía)\n") +
        `\nSugerí las preguntas de screening para esta búsqueda.`,
    };
  },

  draftCandidateProfile({
    hasCvFile,
    cvText,
    linkedinText,
    linkedinFetchFailed,
  }: DraftCandidateProfilePromptInput): Prompt {
    const sources = [
      hasCvFile ? "un CV en PDF adjunto" : null,
      cvText ? "el texto de un CV" : null,
      linkedinText ? "el texto transcripto de un perfil de LinkedIn" : null,
    ].filter(Boolean);

    return {
      system:
        "Sos un asistente que arma perfiles de talento en español rioplatense a partir de un CV " +
        "y/o un perfil de LinkedIn. Devolvés SOLO un objeto JSON con los campos pedidos, " +
        "extrayendo lo que la fuente realmente dice — no inventes experiencia, títulos, empresas, " +
        "instituciones, certificaciones ni fechas que no figuren en el material provisto. Para " +
        "`skills` (tanto el general como el de cada experiencia): nunca las infieras de " +
        "descripciones de tareas o logros; solo de una sección explícita.",
      user:
        `Extraé el perfil de esta persona a partir de ${sources.join(" y ") || "el material adjunto"}` +
        `:\n\n` +
        (cvText ? `Texto del CV:\n"""\n${cvText}\n"""\n\n` : "") +
        (linkedinText
          ? `Texto del perfil de LinkedIn:\n"""\n${linkedinText}\n"""\n\n`
          : "") +
        (linkedinFetchFailed
          ? `No se pudo obtener contenido de la URL de LinkedIn provista; ignorala por completo, ` +
            `no inventes nada a partir de ella.\n\n`
          : "") +
        `Devolvé:\n` +
        `- fullName (nombre completo de la persona tal como figura en el material, si no ` +
        `aparece con claridad, null)\n` +
        `- email (dirección de email de contacto tal como figura en el material, en minúscula; ` +
        `si no aparece, null)\n` +
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

  interviewGuide({
    candidateName,
    jobTitle,
    skills,
  }: InterviewGuideInput): Prompt {
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

  reportInsights({
    jobTitle,
    total,
    hired,
    timeToHireDays,
    topSource,
  }: ReportInsightsInput): Prompt {
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

  /** Los 5 sub-prompts van pegados casi textuales del pedido del cliente (docs/BACKLOG.md §
   *  "Informe de entrevista con IA") — no reformular. */
  interviewReport({
    candidateName,
    jobTitle,
    interviewerName,
    interviewDate,
    sourceText,
  }: InterviewReportInput): Prompt {
    return {
      system:
        "Actuás como un asistente de RRHH que redacta informes de entrevista profesionales y " +
        "estandarizados a partir de notas o una transcripción, en español rioplatense.\n\n" +
        "Método, en este orden: (1) EXTRAER — recorré el texto y sacá cada dato que esté " +
        "presente, aunque esté escrito informal, abreviado o con typos (ej. 'pretende 2500 " +
        "USD' → remuneración pretendida: 'USD 2.500'; 'vive en La Plata' → ubicación: 'La " +
        "Plata'; 'puede arrancar en 2 semanas' → disponibilidad: '2 semanas'). (2) ORGANIZAR " +
        "— ubicá cada dato en su sección. (3) SINTETIZAR — redactá prosa profesional SOLO con " +
        "lo extraído.\n\n" +
        "Reglas duras:\n" +
        "- Si el dato ESTÁ en las notas, tenés que capturarlo. 'No informado' es solo para lo " +
        "que genuinamente no aparece.\n" +
        "- NUNCA inventes información ni emitas conclusiones sin evidencia en el texto.\n" +
        "- NUNCA agregues frases de relleno para que una sección se vea más completa o " +
        "'profesional'. Si una sección tiene poca sustancia real, que quede corta. Un informe " +
        "breve y fiel es mejor que uno largo y genérico.\n" +
        "- El recruiter revisa esto y se lo manda al cliente/hiring manager: escribí a ese nivel.\n\n" +
        INTERVIEW_REPORT_GOLD_EXAMPLE,
      user:
        `Entrevista de ${candidateName} para el puesto de ${jobTitle}, realizada el ` +
        `${interviewDate}, entrevistador/a: ${interviewerName}.\n\n` +
        `Notas o transcripción de la entrevista:\n"""\n${sourceText}\n"""\n\n` +
        "Completá un informe con las siguientes partes, cada una siguiendo EXACTAMENTE su " +
        "instrucción:\n\n" +
        "1. Ubicación, remuneración pretendida y disponibilidad: Identificá durante la " +
        "entrevista, únicamente si fueron mencionados, la ubicación del candidato, la " +
        "remuneración pretendida y la disponibilidad para incorporarse. Si alguno de estos " +
        'datos no puede determinarse, dejar el campo vacío o indicar "No informado". No ' +
        "inventes información.\n\n" +
        "2. Resumen: Analizá la entrevista y redactá un resumen ejecutivo de entre 4 y 6 " +
        "líneas. Describí los principales temas tratados, la experiencia del candidato y la " +
        "impresión general obtenida durante la conversación. No emitas recomendaciones ni " +
        "inventes información.\n\n" +
        "3. Fortalezas observadas: Identificá únicamente las fortalezas que el candidato haya " +
        "demostrado o mencionado durante la entrevista. Todas las fortalezas deben estar " +
        "respaldadas por información presente en la conversación. No agregues fortalezas que " +
        "no hayan sido evidenciadas.\n\n" +
        "4. Aspectos a validar: Identificá los temas que no pudieron validarse completamente " +
        "durante la entrevista y que sería conveniente profundizar en una próxima instancia. " +
        "No presentes estos puntos como debilidades ni hagas suposiciones sobre el " +
        "candidato.\n\n" +
        "5. Recomendación final: Basándote únicamente en la información disponible durante la " +
        "entrevista, emití una recomendación entre las siguientes opciones: avanzar / " +
        "continuar_evaluando / no_avanzar. Justificá la decisión utilizando exclusivamente " +
        "evidencia encontrada en la conversación. Si la información resulta insuficiente " +
        'para tomar una decisión definitiva, recomendá "continuar_evaluando". No inventes ' +
        "información ni emitas conclusiones sin evidencia.",
    };
  },
};
