import { GoogleGenAI, Type } from "@google/genai";

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
  InterviewGuideInput,
  ReportInsightsInput,
} from "./provider";

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
