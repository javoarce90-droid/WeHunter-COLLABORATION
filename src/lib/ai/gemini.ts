import {
  GoogleGenAI,
  Type,
  createUserContent,
  createPartFromBase64,
  createPartFromText,
  type Part,
} from "@google/genai";

import { MockAiProvider } from "./mock";
import { prompts } from "./prompts";
import type {
  AiProvider,
  ScoreApplicationInput,
  ScoreApplicationResult,
  DraftOfferInput,
  DraftJobPostingInput,
  DraftJobOfferInput,
  DraftJobOffer,
  DraftCandidateProfileInput,
  DraftCandidateProfile,
  DraftWorkExperience,
  DraftEducation,
  DraftCertification,
  InterviewGuideInput,
  ReportInsightsInput,
} from "./provider";
import { EMPLOYMENT_LABELS, MODALITY_LABELS } from "@/features/recruiter/jobs/ui/field-meta";

const EMPLOYMENT_TYPES = new Set(Object.keys(EMPLOYMENT_LABELS));
const MODALITIES = new Set(Object.keys(MODALITY_LABELS));

/**
 * Proveedor de IA real sobre Gemini (Google Gen AI). Implementa la MISMA interfaz AiProvider que
 * el mock, así la UI y el dominio no cambian: solo se elige este en `index.ts` cuando hay
 * GEMINI_API_KEY.
 *
 * Responsabilidad de este archivo = TRANSPORTE: hablar con el SDK, pedir JSON estructurado,
 * parsear y caer al mock si falla. El "qué se le pide" al modelo (prompts) vive en `prompts.ts`,
 * agnóstico al proveedor.
 *
 * Resiliencia: cada operación cae al MockAiProvider si la API falla. El dominio puntúa en loop sin
 * atrapar errores (ver puntuar-postulaciones.ts), por lo que un error de red NO debe tumbar el
 * flujo del usuario. El mock garantiza una respuesta determinística y útil siempre.
 */

const DEFAULT_MODEL = "gemini-2.5-flash";

export class GeminiAiProvider implements AiProvider {
  private readonly client: GoogleGenAI;
  private readonly model: string;
  private readonly fallback = new MockAiProvider();

  constructor(apiKey: string, model: string = DEFAULT_MODEL) {
    this.client = new GoogleGenAI({ apiKey });
    this.model = model;
  }

  /** Texto plano: systemInstruction fija rol/tono, el modelo devuelve solo el cuerpo. */
  private async generateText(prompt: { system: string; user: string }): Promise<string> {
    const res = await this.client.models.generateContent({
      model: this.model,
      contents: prompt.user,
      config: { systemInstruction: prompt.system, temperature: 0.7 },
    });
    const text = res.text?.trim();
    if (!text) throw new Error("Gemini devolvió una respuesta vacía");
    return text;
  }

  async scoreApplication(input: ScoreApplicationInput): Promise<ScoreApplicationResult> {
    const prompt = prompts.scoreApplication(input);
    try {
      const res = await this.client.models.generateContent({
        model: this.model,
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
                description: "Señales de atención (ej. sin CV, sin skills coincidentes). Vacío si no hay.",
              },
            },
            required: ["score", "summary", "redFlags"],
          },
        },
      });

      const raw = res.text?.trim();
      if (!raw) throw new Error("Gemini devolvió una respuesta vacía");
      const parsed = JSON.parse(raw) as Partial<ScoreApplicationResult>;

      const score = Math.max(0, Math.min(100, Math.round(Number(parsed.score))));
      if (!Number.isFinite(score) || typeof parsed.summary !== "string") {
        throw new Error("Gemini devolvió un score con forma inesperada");
      }

      return {
        score,
        summary: parsed.summary,
        redFlags: Array.isArray(parsed.redFlags)
          ? parsed.redFlags.filter((f) => typeof f === "string")
          : [],
      };
    } catch (err) {
      logFallback("scoreApplication", err);
      return this.fallback.scoreApplication(input);
    }
  }

  async draftOffer(input: DraftOfferInput): Promise<string> {
    try {
      return await this.generateText(prompts.draftOffer(input));
    } catch (err) {
      logFallback("draftOffer", err);
      return this.fallback.draftOffer(input);
    }
  }

  async draftJobPosting(input: DraftJobPostingInput): Promise<string> {
    try {
      return await this.generateText(prompts.draftJobPosting(input));
    } catch (err) {
      logFallback("draftJobPosting", err);
      return this.fallback.draftJobPosting(input);
    }
  }

  async draftJobOffer(input: DraftJobOfferInput): Promise<DraftJobOffer> {
    const prompt = prompts.draftJobOffer(input);
    try {
      const res = await this.client.models.generateContent({
        model: this.model,
        contents: prompt.user,
        config: {
          systemInstruction: prompt.system,
          temperature: 0.6,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              position: { type: Type.STRING, description: "Puesto real a cubrir." },
              jobArea: { type: Type.STRING, description: "Slug del área/sector del catálogo." },
              objectives: { type: Type.STRING, description: "Objetivos del puesto, Markdown." },
              requirements: { type: Type.STRING, description: "Requisitos, Markdown." },
              responsibilities: { type: Type.STRING, description: "Responsabilidades, Markdown." },
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
              vacancies: { type: Type.INTEGER, description: "Cantidad de vacantes (≥1)." },
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

      const benefits = Array.isArray(parsed.benefits)
        ? parsed.benefits
            .filter((b): b is { name: string; description: string } =>
              !!b && typeof b.name === "string" && typeof b.description === "string",
            )
            .map((b) => ({ name: b.name, description: b.description }))
        : [];
      const vacancies =
        Number.isFinite(Number(parsed.vacancies)) && Number(parsed.vacancies) >= 1
          ? Math.round(Number(parsed.vacancies))
          : 1;

      return {
        position: parsed.position.trim(),
        jobArea: typeof parsed.jobArea === "string" ? parsed.jobArea : null,
        objectives: typeof parsed.objectives === "string" ? parsed.objectives : "",
        requirements: typeof parsed.requirements === "string" ? parsed.requirements : "",
        responsibilities:
          typeof parsed.responsibilities === "string" ? parsed.responsibilities : "",
        benefits,
        vacancies,
        skills: Array.isArray(parsed.skills)
          ? parsed.skills.filter((s): s is string => typeof s === "string")
          : [],
      };
    } catch (err) {
      logFallback("draftJobOffer", err);
      return this.fallback.draftJobOffer(input);
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
      const res = await this.client.models.generateContent({
        model: this.model,
        contents: createUserContent([prompt.user]),
        config: { systemInstruction: prompt.system, temperature: 0.1, tools: [{ urlContext: {} }] },
      });

      const retrievalStatus = res.candidates?.[0]?.urlContextMetadata?.urlMetadata?.[0]?.urlRetrievalStatus;
      const text = res.text?.trim() || null;
      if (retrievalStatus !== "URL_RETRIEVAL_STATUS_SUCCESS" || !text) {
        return { text: null, status: "failed" };
      }
      return { text, status: text.length >= 80 ? "ok" : "low_signal" };
    } catch (err) {
      logFallback("fetchLinkedinProfile", err);
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
      linkedinText: linkedinFetch?.text ?? null,
      linkedinFetchFailed: linkedinFetch?.status === "failed",
    });

    try {
      const parts: Part[] = [];
      if (input.cvFile) parts.push(createPartFromBase64(input.cvFile.base64, input.cvFile.mimeType));
      parts.push(createPartFromText(prompt.user));

      const res = await this.client.models.generateContent({
        model: this.model,
        contents: createUserContent(parts),
        config: {
          systemInstruction: prompt.system,
          temperature: 0.3,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
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
            required: ["headline", "summary", "skills", "workExperiences", "education", "certifications"],
          },
        },
      });

      const raw = res.text?.trim();
      if (!raw) throw new Error("Gemini devolvió una respuesta vacía");
      const parsed = JSON.parse(raw) as Partial<DraftCandidateProfile>;
      if (typeof parsed.headline !== "string" || !parsed.headline.trim()) {
        throw new Error("Gemini devolvió un perfil con forma inesperada");
      }

      return {
        headline: parsed.headline.trim(),
        location: str(parsed.location),
        linkedinUrl: str(parsed.linkedinUrl) ?? input.linkedinUrl ?? null,
        summary: typeof parsed.summary === "string" ? parsed.summary.trim() : "",
        skills: Array.isArray(parsed.skills)
          ? parsed.skills.filter((s): s is string => typeof s === "string")
          : [],
        workExperiences: parseWorkExperiences(parsed.workExperiences),
        education: parseEducation(parsed.education),
        certifications: parseCertifications(parsed.certifications),
        ...(input.linkedinUrl ? { linkedinFetchStatus: linkedinFetch?.status ?? "failed" } : {}),
      };
    } catch (err) {
      logFallback("draftCandidateProfile", err);
      return this.fallback.draftCandidateProfile(input);
    }
  }

  async interviewGuide(input: InterviewGuideInput): Promise<string[]> {
    const prompt = prompts.interviewGuide(input);
    try {
      const res = await this.client.models.generateContent({
        model: this.model,
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
      if (questions.length === 0) throw new Error("Gemini no devolvió preguntas");
      return questions;
    } catch (err) {
      logFallback("interviewGuide", err);
      return this.fallback.interviewGuide(input);
    }
  }

  async reportInsights(input: ReportInsightsInput): Promise<string> {
    try {
      return await this.generateText(prompts.reportInsights(input));
    } catch (err) {
      logFallback("reportInsights", err);
      return this.fallback.reportInsights(input);
    }
  }
}

function logFallback(op: string, err: unknown) {
  // No rompemos el flujo: registramos y caemos al mock. En dev esto ayuda a detectar el problema.
  console.warn(`[ai/gemini] ${op} falló, usando fallback mock:`, err instanceof Error ? err.message : err);
}

// Gemini a veces devuelve el string literal "null" en vez de JSON null para campos STRING sin
// valor (el responseSchema no soporta marcar un STRING como nullable) — se trata igual que null.
const str = (v: unknown): string | null => {
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  return trimmed && trimmed.toLowerCase() !== "null" ? trimmed : null;
};
const strArray = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((s): s is string => typeof s === "string" && s.trim().length > 0) : [];

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
      modality: MODALITIES.has(String(e.modality)) ? (e.modality as DraftWorkExperience["modality"]) : null,
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
