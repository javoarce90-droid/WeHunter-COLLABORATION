import {
  GoogleGenAI,
  Type,
  createUserContent,
  createPartFromBase64,
  createPartFromText,
  type Part,
  type GenerateContentParameters,
  type GenerateContentResponse,
} from "@google/genai";

import { MockAiProvider } from "./mock";
import { prompts } from "./prompts";
import { AiUnavailableError } from "./errors";
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
  DraftWorkExperience,
  DraftEducation,
  DraftCertification,
  InterviewGuideInput,
  ReportInsightsInput,
  InterviewReportInput,
  InterviewReportResult,
  InterviewReportRecommendation,
} from "./provider";
import {
  EMPLOYMENT_LABELS,
  MODALITY_LABELS,
} from "@/features/recruiter/jobs/ui/field-meta";

const EMPLOYMENT_TYPES = new Set(Object.keys(EMPLOYMENT_LABELS));
const MODALITIES = new Set(Object.keys(MODALITY_LABELS));

/**
 * Proveedor de IA real sobre Gemini (Google Gen AI). Implementa la MISMA interfaz AiProvider que
 * el mock, así la UI y el dominio no cambian: solo se elige este en `index.ts` cuando hay
 * GEMINI_API_KEY.
 *
 * Responsabilidad de este archivo = TRANSPORTE: hablar con el SDK, pedir JSON estructurado,
 * parsear, y aplicar la política de degradación. El "qué se le pide" al modelo (prompts) vive
 * en `prompts.ts`, agnóstico al proveedor.
 *
 * Política de degradación (ver errors.ts) — en orden, por llamada:
 *   1. modelo principal, con reintentos ante errores transitorios (`withRetry`);
 *   2. modelo de degradación (más rápido/barato), mismo trato;
 *   3. según la operación:
 *      - lote / prosa de bajo riesgo (scoreApplication, draftOffer, interviewGuide…):
 *        heurístico local del MockAiProvider. `scoreApplication` marca `degraded` para que la
 *        UI no lo confunda con un análisis real; el loop de scoring NO se puede tumbar.
 *      - un solo tiro de alto valor (draftJobOffer, interviewReport): AiUnavailableError →
 *        la action devuelve "reintentá en unos minutos". Un resultado de plantilla que el
 *        usuario cree que hizo la IA es peor que un error honesto.
 * Cada llamada emite una línea `ai_call` de telemetría (`recordAiCall`).
 */

/**
 * Modelo principal (rápido, para que ninguna operación con IA sea una espera larga) y modelo de
 * degradación (se prueba solo si el principal falla — errores/429 —, no por lentitud). Ambos
 * configurables por env.
 *
 * Se usan los alias flotantes `*-latest` a propósito: Google deja de servir las versiones
 * pinneadas viejas a las cuentas nuevas (ej. `gemini-2.5-pro`/`-flash` ya devuelven 404), y un
 * ATS en producción no puede romperse cada vez que sale un modelo nuevo. Si querés fijar una
 * versión puntual (determinismo para evals), seteá GEMINI_MODEL_PRIMARY / GEMINI_MODEL_FALLBACK.
 *
 * Por operación: Pro (más capaz pero ~10× más lento) NO se usa por defecto en ninguna — todas
 * hoy bloquean un spinner o una función serverless. Para promover una operación puntual a Pro
 * (candidata: `interviewReport`) sin tocar código, seteá GEMINI_MODEL_OVERRIDES (ver más abajo).
 */
export const DEFAULT_PRIMARY_MODEL = "gemini-flash-latest";
export const DEFAULT_FALLBACK_MODEL = "gemini-pro-latest";

/**
 * Cascada de modelos por operación, vía env `GEMINI_MODEL_OVERRIDES` (JSON). Clave = nombre de
 * método de `AiProvider`; valor = un modelo o una cascada separada por coma. Ej:
 *   GEMINI_MODEL_OVERRIDES={"interviewReport":"gemini-pro-latest,gemini-flash-latest"}
 */
export function parseModelOverrides(
  raw: string | undefined,
): Record<string, string[]> {
  if (!raw?.trim()) return {};
  try {
    const obj = JSON.parse(raw) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(obj).map(([op, v]) => [
        op,
        String(v)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      ]),
    );
  } catch {
    console.warn("[ai] GEMINI_MODEL_OVERRIDES no es JSON válido — se ignora");
    return {};
  }
}

export class GeminiAiProvider implements AiProvider {
  private readonly client: GoogleGenAI;
  /** Cascada de modelos por defecto: [principal, degradación]. Se prueban en orden. */
  private readonly models: string[];
  /** Cascada distinta para operaciones puntuales (clave = nombre de método). */
  private readonly overridesByOp: Record<string, string[]>;
  private readonly fallback = new MockAiProvider();

  constructor(
    apiKey: string,
    models: string | string[] = [DEFAULT_PRIMARY_MODEL, DEFAULT_FALLBACK_MODEL],
    overridesByOp: Record<string, string[]> = {},
  ) {
    this.client = new GoogleGenAI({ apiKey });
    const list = (Array.isArray(models) ? models : [models])
      .map((m) => m.trim())
      .filter(Boolean);
    this.models = [...new Set(list.length > 0 ? list : [DEFAULT_PRIMARY_MODEL])];
    this.overridesByOp = overridesByOp;
  }

  /**
   * Una llamada a Gemini con cascada de modelos + reintentos + telemetría. Prueba el modelo
   * principal (con backoff ante errores transitorios); si se agota, prueba el siguiente de
   * `this.models` (degradación de modelo, todavía IA real). Si todos fallan, propaga el último
   * error — el método llamador decide si degrada al heurístico local o corta con
   * AiUnavailableError. Devuelve también qué modelo respondió y cuántos intentos costó.
   */
  private async generate(
    op: string,
    params: Omit<GenerateContentParameters, "model">,
  ): Promise<{ res: GenerateContentResponse; attempts: number; model: string }> {
    const chain = this.overridesByOp[op]?.length
      ? this.overridesByOp[op]
      : this.models;
    let lastErr: unknown;
    for (const model of chain) {
      try {
        const { value, attempts } = await withRetry(() =>
          this.client.models.generateContent({ ...params, model }),
        );
        return { res: value, attempts, model };
      } catch (err) {
        lastErr = err;
        // Se prueba el siguiente modelo ante CUALQUIER error: un 429 de cuota del Pro puede no
        // aplicar al Flash, y un fallo de contenido puede resolverse distinto en otro modelo.
      }
    }
    throw lastErr;
  }

  /** Texto plano: systemInstruction fija rol/tono, el modelo devuelve solo el cuerpo.
   *  Reintenta ante errores transitorios; el llamador (cada método) decide qué hacer si falla. */
  private async generateText(
    op: string,
    prompt: { system: string; user: string },
  ): Promise<{ text: string; attempts: number; model: string }> {
    const { res, attempts, model } = await this.generate(op, {
      contents: prompt.user,
      config: { systemInstruction: prompt.system, temperature: 0.7 },
    });
    const text = res.text?.trim();
    if (!text) throw new Error("Gemini devolvió una respuesta vacía");
    return { text, attempts, model };
  }

  /** Envoltura común de las operaciones de prosa de bajo riesgo (oferta, aviso, insights):
   *  reintenta, mide, y si igual falla degrada al mock EN SILENCIO — el costo de fricción de
   *  pedirle al usuario que reintente no se justifica para estos textos. */
  private async textOrFallback(
    op: string,
    prompt: { system: string; user: string },
    fallback: () => Promise<string>,
  ): Promise<string> {
    const t0 = Date.now();
    try {
      const { text, attempts, model } = await this.generateText(op, prompt);
      recordAiCall(op, "ok", { ms: Date.now() - t0, attempts, model });
      return text;
    } catch (err) {
      recordAiCall(op, "degraded", { ms: Date.now() - t0, attempts: this.models.length, err });
      return fallback();
    }
  }

  async scoreApplication(
    input: ScoreApplicationInput,
  ): Promise<ScoreApplicationResult> {
    const prompt = prompts.scoreApplication(input);
    const t0 = Date.now();
    try {
      const { res, attempts, model } = await this.generate("scoreApplication", {
        contents: prompt.user,
        config: {
          systemInstruction: prompt.system,
          temperature: 0.2,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              score: {
                type: Type.INTEGER,
                description: "Compatibilidad 0–100. 100 = match perfecto.",
              },
              summary: {
                type: Type.STRING,
                description: "Resumen del match en 1–2 frases.",
              },
              redFlags: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description:
                  "Señales de atención (ej. perfil sin información cargada, sin skills coincidentes). Vacío si no hay. Nunca marques la falta de CV como señal de atención.",
              },
              breakdown: {
                type: Type.OBJECT,
                description:
                  "Desglose del match por categoría, 0–100 cada una.",
                properties: {
                  experiencia: { type: Type.INTEGER },
                  skillsTecnicos: { type: Type.INTEGER },
                  seniority: { type: Type.INTEGER },
                  idiomas: { type: Type.INTEGER },
                  ubicacion: { type: Type.INTEGER },
                },
                required: [
                  "experiencia",
                  "skillsTecnicos",
                  "seniority",
                  "idiomas",
                  "ubicacion",
                ],
              },
              strengths: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description:
                  "2 a 4 puntos fuertes concretos del candidato para este puesto.",
              },
            },
            required: [
              "score",
              "summary",
              "redFlags",
              "breakdown",
              "strengths",
            ],
          },
        },
      });

      const raw = res.text?.trim();
      if (!raw) throw new Error("Gemini devolvió una respuesta vacía");
      const parsed = JSON.parse(raw) as Partial<ScoreApplicationResult>;

      const score = Math.max(
        0,
        Math.min(100, Math.round(Number(parsed.score))),
      );
      const clampCat = (n: unknown) =>
        Math.max(0, Math.min(100, Math.round(Number(n))));
      if (
        !Number.isFinite(score) ||
        typeof parsed.summary !== "string" ||
        !parsed.breakdown ||
        !Number.isFinite(Number(parsed.breakdown.experiencia))
      ) {
        throw new Error("Gemini devolvió un score con forma inesperada");
      }

      recordAiCall("scoreApplication", "ok", { ms: Date.now() - t0, attempts, model });
      return {
        score,
        summary: parsed.summary,
        redFlags: Array.isArray(parsed.redFlags)
          ? parsed.redFlags.filter((f) => typeof f === "string")
          : [],
        breakdown: {
          experiencia: clampCat(parsed.breakdown.experiencia),
          skillsTecnicos: clampCat(parsed.breakdown.skillsTecnicos),
          seniority: clampCat(parsed.breakdown.seniority),
          idiomas: clampCat(parsed.breakdown.idiomas),
          ubicacion: clampCat(parsed.breakdown.ubicacion),
        },
        strengths: Array.isArray(parsed.strengths)
          ? parsed.strengths.filter((f) => typeof f === "string")
          : [],
        degraded: false,
      };
    } catch (err) {
      // Loop de scoring (N postulados): NO se corta el flujo — se degrada al heurístico local,
      // pero el resultado queda marcado `degraded` (ver mock) para que la UI no lo confunda con
      // un análisis real de la IA.
      recordAiCall("scoreApplication", "degraded", {
        ms: Date.now() - t0,
        attempts: this.models.length,
        err,
      });
      return this.fallback.scoreApplication(input);
    }
  }

  async draftOffer(input: DraftOfferInput): Promise<string> {
    return this.textOrFallback("draftOffer", prompts.draftOffer(input), () =>
      this.fallback.draftOffer(input),
    );
  }

  async draftJobPosting(input: DraftJobPostingInput): Promise<string> {
    return this.textOrFallback(
      "draftJobPosting",
      prompts.draftJobPosting(input),
      () => this.fallback.draftJobPosting(input),
    );
  }

  async draftJobOffer(input: DraftJobOfferInput): Promise<DraftJobOffer> {
    const prompt = prompts.draftJobOffer(input);
    const t0 = Date.now();
    try {
      const { res, attempts, model } = await this.generate("draftJobOffer", {
        contents: prompt.user,
        config: {
          systemInstruction: prompt.system,
          temperature: 0.7,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              position: {
                type: Type.STRING,
                description: "Puesto real a cubrir.",
              },
              jobArea: {
                type: Type.STRING,
                description: "Slug del área/sector del catálogo.",
              },
              objectives: {
                type: Type.STRING,
                description: "Objetivos del puesto, Markdown.",
              },
              requirements: {
                type: Type.STRING,
                description: "Requisitos, Markdown.",
              },
              responsibilities: {
                type: Type.STRING,
                description: "Responsabilidades, Markdown.",
              },
              benefits: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    description: { type: Type.STRING },
                  },
                  required: ["name", "description"],
                },
              },
              vacancies: {
                type: Type.INTEGER,
                description: "Cantidad de vacantes (≥1).",
              },
              skills: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: [
              "position",
              "objectives",
              "requirements",
              "responsibilities",
              "benefits",
              "vacancies",
              "skills",
            ],
          },
        },
      });

      const raw = res.text?.trim();
      if (!raw) throw new Error("Gemini devolvió una respuesta vacía");
      const parsed = JSON.parse(raw) as Partial<DraftJobOffer>;
      if (typeof parsed.position !== "string" || !parsed.position.trim()) {
        throw new Error("Gemini devolvió un borrador con forma inesperada");
      }
      recordAiCall("draftJobOffer", "ok", { ms: Date.now() - t0, attempts, model });

      const benefits = Array.isArray(parsed.benefits)
        ? parsed.benefits
            .filter(
              (b): b is { name: string; description: string } =>
                !!b &&
                typeof b.name === "string" &&
                typeof b.description === "string",
            )
            .map((b) => ({ name: b.name, description: b.description }))
        : [];
      const vacancies =
        Number.isFinite(Number(parsed.vacancies)) &&
        Number(parsed.vacancies) >= 1
          ? Math.round(Number(parsed.vacancies))
          : 1;

      return {
        position: parsed.position.trim(),
        jobArea: typeof parsed.jobArea === "string" ? parsed.jobArea : null,
        objectives:
          typeof parsed.objectives === "string" ? parsed.objectives : "",
        requirements:
          typeof parsed.requirements === "string" ? parsed.requirements : "",
        responsibilities:
          typeof parsed.responsibilities === "string"
            ? parsed.responsibilities
            : "",
        benefits,
        vacancies,
        skills: Array.isArray(parsed.skills)
          ? parsed.skills.filter((s): s is string => typeof s === "string")
          : [],
      };
    } catch (err) {
      // Operación interactiva de un solo tiro: NO se degrada al mock. Un borrador de plantilla
      // que el recruiter cree que enriqueció la IA (skills = palabras sueltas del brief,
      // requisitos genéricos) es exactamente el bug reportado. Mejor un error claro y reintento.
      recordAiCall("draftJobOffer", "unavailable", {
        ms: Date.now() - t0,
        attempts: this.models.length,
        err,
      });
      throw new AiUnavailableError(isQuotaError(err) ? "quota" : "error", err);
    }
  }

  async draftScreeningQuestions(
    input: DraftScreeningQuestionsInput,
  ): Promise<DraftScreeningQuestion[]> {
    const prompt = prompts.draftScreeningQuestions(input);
    const t0 = Date.now();
    try {
      const { res, attempts, model } = await this.generate("draftScreeningQuestions", {
        contents: prompt.user,
        config: {
          systemInstruction: prompt.system,
          temperature: 0.6,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                label: { type: Type.STRING },
                type: {
                  type: Type.STRING,
                  enum: ["yes_no", "text", "number", "multiple_choice"],
                },
                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                isCriterion: { type: Type.BOOLEAN },
                expectedValues: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                minValue: { type: Type.NUMBER },
                maxValue: { type: Type.NUMBER },
              },
              required: ["label", "type", "isCriterion"],
            },
          },
        },
      });

      const raw = res.text?.trim();
      if (!raw) throw new Error("Gemini devolvió una respuesta vacía");
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed))
        throw new Error("Gemini devolvió una forma inesperada");
      recordAiCall("draftScreeningQuestions", "ok", { ms: Date.now() - t0, attempts, model });

      const VALID_TYPES = new Set([
        "yes_no",
        "text",
        "number",
        "multiple_choice",
      ]);
      return parsed
        .filter(
          (q): q is Record<string, unknown> =>
            !!q &&
            typeof q === "object" &&
            typeof (q as Record<string, unknown>).label === "string",
        )
        .filter((q) => VALID_TYPES.has(String(q.type)))
        .map((q) => ({
          label: String(q.label).trim(),
          type: String(q.type),
          options: Array.isArray(q.options)
            ? q.options.filter((o): o is string => typeof o === "string")
            : undefined,
          isCriterion: q.isCriterion === true,
          expectedValues: Array.isArray(q.expectedValues)
            ? q.expectedValues.filter((v): v is string => typeof v === "string")
            : undefined,
          minValue: typeof q.minValue === "number" ? q.minValue : null,
          maxValue: typeof q.maxValue === "number" ? q.maxValue : null,
        }))
        .filter((q) => q.label.length > 0);
    } catch (err) {
      // Sugerencias de bajo riesgo: el mock devuelve preguntas razonables. Degradación silenciosa.
      recordAiCall("draftScreeningQuestions", "degraded", {
        ms: Date.now() - t0,
        attempts: this.models.length,
        err,
      });
      return this.fallback.draftScreeningQuestions(input);
    }
  }

  /**
   * Best-effort: intenta transcribir un perfil de LinkedIn vía la tool de URL-context de
   * Gemini. LinkedIn bloquea scraping seguido — un fallo acá NO aborta el flujo, solo hace
   * que el perfil se arme sin esa fuente (ver draftCandidateProfile).
   */
  private async fetchLinkedinProfile(
    linkedinUrl: string,
  ): Promise<{ text: string | null; status: "ok" | "low_signal" | "failed" }> {
    try {
      const prompt = prompts.fetchLinkedinProfile(linkedinUrl);
      const { res } = await this.generate("fetchLinkedinProfile", {
        contents: createUserContent([prompt.user]),
        config: {
          systemInstruction: prompt.system,
          temperature: 0.1,
          tools: [{ urlContext: {} }],
        },
      });

      const retrievalStatus =
        res.candidates?.[0]?.urlContextMetadata?.urlMetadata?.[0]
          ?.urlRetrievalStatus;
      const text = res.text?.trim() || null;
      if (retrievalStatus !== "URL_RETRIEVAL_STATUS_SUCCESS" || !text) {
        return { text: null, status: "failed" };
      }
      return { text, status: text.length >= 80 ? "ok" : "low_signal" };
    } catch (err) {
      recordAiCall("fetchLinkedinProfile", "degraded", { ms: 0, attempts: 1, err });
      return { text: null, status: "failed" };
    }
  }

  async draftCandidateProfile(
    input: DraftCandidateProfileInput,
  ): Promise<DraftCandidateProfile> {
    // Gemini no acepta combinar la tool de URL-context con responseSchema en el mismo pedido
    // (confirmado contra la API real) — por eso son dos llamadas separadas.
    const linkedinFetch = input.linkedinUrl
      ? await this.fetchLinkedinProfile(input.linkedinUrl)
      : null;

    const prompt = prompts.draftCandidateProfile({
      hasCvFile: !!input.cvFile,
      cvText: input.cvText?.trim() || null,
      linkedinText: linkedinFetch?.text ?? null,
      linkedinFetchFailed: linkedinFetch?.status === "failed",
    });

    try {
      const parts: Part[] = [];
      if (input.cvFile)
        parts.push(
          createPartFromBase64(input.cvFile.base64, input.cvFile.mimeType),
        );
      parts.push(createPartFromText(prompt.user));

      const t0 = Date.now();
      const { res, attempts, model } = await this.generate("draftCandidateProfile", {
        contents: createUserContent(parts),
        config: {
          systemInstruction: prompt.system,
          temperature: 0.3,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              fullName: { type: Type.STRING },
              email: { type: Type.STRING },
              phone: { type: Type.STRING },
              headline: { type: Type.STRING },
              location: { type: Type.STRING },
              linkedinUrl: { type: Type.STRING },
              summary: { type: Type.STRING },
              skills: { type: Type.ARRAY, items: { type: Type.STRING } },
              workExperiences: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    company: { type: Type.STRING },
                    position: { type: Type.STRING },
                    startDate: { type: Type.STRING },
                    endDate: { type: Type.STRING },
                    description: { type: Type.STRING },
                    employmentType: { type: Type.STRING },
                    modality: { type: Type.STRING },
                    skills: { type: Type.ARRAY, items: { type: Type.STRING } },
                  },
                  required: ["company", "position"],
                },
              },
              education: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    institution: { type: Type.STRING },
                    degree: { type: Type.STRING },
                    fieldOfStudy: { type: Type.STRING },
                    startDate: { type: Type.STRING },
                    endDate: { type: Type.STRING },
                    description: { type: Type.STRING },
                    grade: { type: Type.STRING },
                    activities: { type: Type.STRING },
                  },
                  required: ["institution", "degree"],
                },
              },
              certifications: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    url: { type: Type.STRING },
                  },
                  required: ["name"],
                },
              },
            },
            required: [
              "headline",
              "summary",
              "skills",
              "workExperiences",
              "education",
              "certifications",
            ],
          },
        },
      });

      const raw = res.text?.trim();
      if (!raw) throw new Error("Gemini devolvió una respuesta vacía");
      const parsed = JSON.parse(raw) as Partial<DraftCandidateProfile>;
      if (typeof parsed.headline !== "string" || !parsed.headline.trim()) {
        throw new Error("Gemini devolvió un perfil con forma inesperada");
      }
      recordAiCall("draftCandidateProfile", "ok", { ms: Date.now() - t0, attempts, model });

      return {
        fullName: str(parsed.fullName),
        email: str(parsed.email)?.toLowerCase() ?? null,
        phone: str(parsed.phone),
        headline: parsed.headline.trim(),
        location: str(parsed.location),
        linkedinUrl: str(parsed.linkedinUrl) ?? input.linkedinUrl ?? null,
        summary:
          typeof parsed.summary === "string" ? parsed.summary.trim() : "",
        skills: Array.isArray(parsed.skills)
          ? parsed.skills.filter((s): s is string => typeof s === "string")
          : [],
        workExperiences: parseWorkExperiences(parsed.workExperiences),
        education: parseEducation(parsed.education),
        certifications: parseCertifications(parsed.certifications),
        ...(input.linkedinUrl
          ? { linkedinFetchStatus: linkedinFetch?.status ?? "failed" }
          : {}),
      };
    } catch (err) {
      recordAiCall("draftCandidateProfile", "degraded", {
        ms: 0,
        attempts: this.models.length,
        err,
      });
      // A diferencia de otros fallbacks (que devuelven prosa genérica sin gran diferencia visible
      // para el usuario), acá el mock es un placeholder casi vacío — sin esta marca, un fallo real
      // de Gemini es indistinguible de "el candidato eligió completar todo a mano" (bug reportado).
      const fallback = await this.fallback.draftCandidateProfile(input);
      return {
        ...fallback,
        extractionFailed: true,
        failureReason: isQuotaError(err) ? "quota" : "unreadable",
      };
    }
  }

  async interviewGuide(input: InterviewGuideInput): Promise<string[]> {
    const prompt = prompts.interviewGuide(input);
    const t0 = Date.now();
    try {
      const { res, attempts, model } = await this.generate("interviewGuide", {
        contents: prompt.user,
        config: {
          systemInstruction: prompt.system,
          temperature: 0.6,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              questions: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ["questions"],
          },
        },
      });

      const raw = res.text?.trim();
      if (!raw) throw new Error("Gemini devolvió una respuesta vacía");
      const parsed = JSON.parse(raw) as { questions?: unknown };
      const questions = Array.isArray(parsed.questions)
        ? parsed.questions.filter((q): q is string => typeof q === "string")
        : [];
      if (questions.length === 0)
        throw new Error("Gemini no devolvió preguntas");
      recordAiCall("interviewGuide", "ok", { ms: Date.now() - t0, attempts, model });
      return questions;
    } catch (err) {
      recordAiCall("interviewGuide", "degraded", {
        ms: Date.now() - t0,
        attempts: this.models.length,
        err,
      });
      return this.fallback.interviewGuide(input);
    }
  }

  async reportInsights(input: ReportInsightsInput): Promise<string> {
    return this.textOrFallback(
      "reportInsights",
      prompts.reportInsights(input),
      () => this.fallback.reportInsights(input),
    );
  }

  async interviewReport(input: InterviewReportInput): Promise<InterviewReportResult> {
    const prompt = prompts.interviewReport(input);
    const t0 = Date.now();
    try {
      const { res, attempts, model } = await this.generate("interviewReport", {
        contents: prompt.user,
        config: {
          systemInstruction: prompt.system,
          temperature: 0.3,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              ubicacion: {
                type: Type.STRING,
                description: 'Ubicación del candidato, o "No informado".',
              },
              remuneracionPretendida: {
                type: Type.STRING,
                description: 'Remuneración pretendida, o "No informado".',
              },
              disponibilidad: {
                type: Type.STRING,
                description: 'Disponibilidad para incorporarse, o "No informado".',
              },
              resumen: {
                type: Type.STRING,
                description: "Resumen ejecutivo de 4 a 6 líneas.",
              },
              fortalezas: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Fortalezas evidenciadas en la conversación.",
              },
              aspectosAValidar: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Temas a profundizar en una próxima instancia.",
              },
              recommendation: {
                type: Type.STRING,
                description: "avanzar | continuar_evaluando | no_avanzar",
              },
              recommendationJustification: {
                type: Type.STRING,
                description: "Justificación de la recomendación, con evidencia de la conversación.",
              },
            },
            required: [
              "ubicacion",
              "remuneracionPretendida",
              "disponibilidad",
              "resumen",
              "fortalezas",
              "aspectosAValidar",
              "recommendation",
              "recommendationJustification",
            ],
          },
        },
      });

      const raw = res.text?.trim();
      if (!raw) throw new Error("Gemini devolvió una respuesta vacía");
      const parsed = JSON.parse(raw) as Partial<InterviewReportResult>;
      if (
        typeof parsed.resumen !== "string" ||
        typeof parsed.recommendationJustification !== "string"
      ) {
        throw new Error("Gemini devolvió un informe con forma inesperada");
      }
      recordAiCall("interviewReport", "ok", { ms: Date.now() - t0, attempts, model });

      const RECOMMENDATIONS = new Set<InterviewReportRecommendation>([
        "avanzar",
        "continuar_evaluando",
        "no_avanzar",
      ]);
      const recommendation = RECOMMENDATIONS.has(parsed.recommendation as InterviewReportRecommendation)
        ? (parsed.recommendation as InterviewReportRecommendation)
        : "continuar_evaluando";

      return {
        ubicacion: str(parsed.ubicacion) ?? "No informado",
        remuneracionPretendida: str(parsed.remuneracionPretendida) ?? "No informado",
        disponibilidad: str(parsed.disponibilidad) ?? "No informado",
        resumen: parsed.resumen,
        fortalezas: strArray(parsed.fortalezas),
        aspectosAValidar: strArray(parsed.aspectosAValidar),
        recommendation,
        recommendationJustification: parsed.recommendationJustification,
      };
    } catch (err) {
      // El informe se persiste y el recruiter lo edita para mandárselo al cliente: un informe
      // de plantilla (todo "No informado", frases genéricas) es peor que pedir un reintento.
      recordAiCall("interviewReport", "unavailable", {
        ms: Date.now() - t0,
        attempts: this.models.length,
        err,
      });
      throw new AiUnavailableError(isQuotaError(err) ? "quota" : "error", err);
    }
  }
}

/** Resultado observable de una operación de IA. `ok` = el modelo real respondió (con o sin
 *  reintentos); `degraded` = falló y se sirvió el heurístico local; `unavailable` = falló y se
 *  cortó con AiUnavailableError. Se emite una línea por llamada para poder responder "¿la IA
 *  está funcionando?" sin adivinar (hoy no hay forma). */
type AiCallOutcome = "ok" | "degraded" | "unavailable";

function recordAiCall(
  op: string,
  outcome: AiCallOutcome,
  meta: { ms: number; attempts: number; model?: string; err?: unknown },
) {
  const line = {
    tag: "ai_call",
    op,
    outcome,
    ms: Math.round(meta.ms),
    attempts: meta.attempts,
    ...(meta.model ? { model: meta.model } : {}),
    ...(meta.err
      ? { error: meta.err instanceof Error ? meta.err.message : String(meta.err) }
      : {}),
  };
  // JSON en una línea → grep-eable en los logs de Vercel (ej. `outcome!="ok"` para ver degradación).
  if (outcome === "ok") console.log(JSON.stringify(line));
  else console.warn(JSON.stringify(line));
}

const RETRY_BACKOFF_MS = [800, 2500];
/** Intentos totales = primer intento + un reintento por cada backoff. */
const MAX_ATTEMPTS = RETRY_BACKOFF_MS.length + 1;

/**
 * Reintenta una llamada a Gemini ante errores transitorios (429 rate-limit, 503, red) con
 * backoff. Los 429 por cuota DIARIA no se recuperan en segundos — igual se reintenta una vez
 * por si es rate-limit por minuto — pero si persiste, el llamador decide (degradar o cortar).
 * Devuelve el valor y cuántos intentos costó; propaga el último error si se agotan.
 */
async function withRetry<T>(
  run: () => Promise<T>,
): Promise<{ value: T; attempts: number }> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return { value: await run(), attempts: attempt };
    } catch (err) {
      lastErr = err;
      if (!isRetryableError(err) || attempt === MAX_ATTEMPTS) break;
      await new Promise((r) => setTimeout(r, RETRY_BACKOFF_MS[attempt - 1]));
    }
  }
  throw lastErr;
}

function isRetryableError(err: unknown): boolean {
  if (isQuotaError(err)) return true;
  const status =
    err && typeof err === "object" && "status" in err
      ? (err as { status?: number }).status
      : undefined;
  if (status === 503 || status === 500 || status === 429) return true;
  const msg = err instanceof Error ? err.message : String(err);
  return /\b(503|500|ECONNRESET|ETIMEDOUT|fetch failed|network)\b/i.test(msg);
}

/** 429 de la API de Gemini (rate limit o cuota diaria del free tier). El mensaje del SDK trae
 *  `"code":429` / `RESOURCE_EXHAUSTED`; algunos errores además exponen `.status`. */
function isQuotaError(err: unknown): boolean {
  if (err && typeof err === "object" && "status" in err && (err as { status?: number }).status === 429) {
    return true;
  }
  const msg = err instanceof Error ? err.message : String(err);
  return /"code":\s*429|RESOURCE_EXHAUSTED|exceeded your current quota/i.test(msg);
}

// Gemini a veces devuelve el string literal "null" en vez de JSON null para campos STRING sin
// valor (el responseSchema no soporta marcar un STRING como nullable) — se trata igual que null.
const str = (v: unknown): string | null => {
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  return trimmed && trimmed.toLowerCase() !== "null" ? trimmed : null;
};
const strArray = (v: unknown): string[] =>
  Array.isArray(v)
    ? v.filter((s): s is string => typeof s === "string" && s.trim().length > 0)
    : [];

function parseWorkExperiences(raw: unknown): DraftWorkExperience[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((e): e is Record<string, unknown> => !!e && typeof e === "object")
    .filter((e) => str(e.company) && str(e.position))
    .map((e) => ({
      company: str(e.company)!,
      position: str(e.position)!,
      startDate: str(e.startDate),
      endDate: str(e.endDate),
      description: str(e.description),
      employmentType: EMPLOYMENT_TYPES.has(String(e.employmentType))
        ? (e.employmentType as DraftWorkExperience["employmentType"])
        : null,
      modality: MODALITIES.has(String(e.modality))
        ? (e.modality as DraftWorkExperience["modality"])
        : null,
      skills: strArray(e.skills),
    }));
}

function parseEducation(raw: unknown): DraftEducation[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((e): e is Record<string, unknown> => !!e && typeof e === "object")
    .filter((e) => str(e.institution) && str(e.degree))
    .map((e) => ({
      institution: str(e.institution)!,
      degree: str(e.degree)!,
      fieldOfStudy: str(e.fieldOfStudy),
      startDate: str(e.startDate),
      endDate: str(e.endDate),
      description: str(e.description),
      grade: str(e.grade),
      activities: str(e.activities),
    }));
}

function parseCertifications(raw: unknown): DraftCertification[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((c): c is Record<string, unknown> => !!c && typeof c === "object")
    .filter((c) => str(c.name))
    .map((c) => ({ name: str(c.name)!, url: str(c.url) }));
}
