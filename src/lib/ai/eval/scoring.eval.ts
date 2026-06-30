import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { GoogleGenAI, Type } from "@google/genai";
import { test } from "vitest";

import { prompts } from "@/lib/ai/prompts";
import type { ScoreApplicationInput } from "@/lib/ai/provider";

/**
 * Harness de evaluación del scoring de IA. NO corre con `pnpm test` (no matchea *.test.ts):
 * se corre a propósito con `pnpm ai:eval`. Usa los MISMOS prompts que la app (prompts.ts), así
 * mide lo que el modelo recibe de verdad, y reporta score + redFlags + tokens + latencia por caso.
 *
 * Sirve para AFINAR PROMPTS: cambiás `prompts.scoreApplication`, corrés esto, y comparás scores
 * contra la 'band' esperada del dataset + el consumo de tokens. Para evaluar con tus propios datos,
 * editá `dataset.json`.
 */

const __dirname = dirname(fileURLToPath(import.meta.url));

type Case = {
  name: string;
  band: [number, number] | null;
  job: ScoreApplicationInput["job"];
  candidate: ScoreApplicationInput["candidate"];
};

/** Mini-parser de .env (sin dependencias): vitest no carga .env por sí solo. */
function loadEnv(): Record<string, string> {
  try {
    return Object.fromEntries(
      readFileSync(join(process.cwd(), ".env"), "utf8")
        .split("\n")
        .filter((l) => l.trim() && !l.trim().startsWith("#") && l.includes("="))
        .map((l) => {
          const i = l.indexOf("=");
          return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
        }),
    );
  } catch {
    return {};
  }
}

const SCORE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    score: { type: Type.INTEGER },
    summary: { type: Type.STRING },
    redFlags: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: ["score", "summary", "redFlags"],
};

test(
  "eval scoring dataset → reporte de scores, redFlags, tokens y latencia",
  async () => {
    const env = { ...loadEnv(), ...process.env };
    const apiKey = env.GEMINI_API_KEY;
    const model = env.GEMINI_MODEL || "gemini-2.5-flash";
    if (!apiKey) {
      console.warn("\n[ai:eval] Falta GEMINI_API_KEY en .env — no se puede evaluar contra el modelo real.\n");
      return;
    }

    const { cases } = JSON.parse(readFileSync(join(__dirname, "dataset.json"), "utf8")) as { cases: Case[] };
    const ai = new GoogleGenAI({ apiKey });

    console.log(`\n[ai:eval] modelo=${model} · casos=${cases.length}\n`);
    const rows: string[] = [
      "caso,banda_esperada,score,en_banda,prompt_tokens,output_tokens,total_tokens,latencia_ms,red_flags,resumen",
    ];

    let totalTokens = 0;
    for (const c of cases) {
      const prompt = prompts.scoreApplication({ job: c.job, candidate: c.candidate });
      const t0 = Date.now();
      const res = await ai.models.generateContent({
        model,
        contents: prompt.user,
        config: {
          systemInstruction: prompt.system,
          temperature: 0.2,
          responseMimeType: "application/json",
          responseSchema: SCORE_SCHEMA,
        },
      });
      const latency = Date.now() - t0;

      const parsed = JSON.parse(res.text ?? "{}") as { score?: number; summary?: string; redFlags?: string[] };
      const score = Number(parsed.score);
      const usage = res.usageMetadata;
      const inBand = c.band ? (score >= c.band[0] && score <= c.band[1] ? "sí" : "NO ⚠️") : "—";
      totalTokens += usage?.totalTokenCount ?? 0;

      console.log(
        `• ${c.name.padEnd(34)} score=${String(score).padStart(3)} ` +
          `(esperado ${c.band ? `${c.band[0]}–${c.band[1]}` : "libre"}, ${inBand}) ` +
          `tok=${usage?.totalTokenCount ?? "?"} ${latency}ms`,
      );
      console.log(`    redFlags: ${(parsed.redFlags ?? []).join(" | ") || "—"}`);
      console.log(`    resumen:  ${parsed.summary ?? "—"}\n`);

      const csv = (s: string) => `"${String(s).replace(/"/g, '""')}"`;
      rows.push(
        [
          csv(c.name),
          c.band ? `${c.band[0]}-${c.band[1]}` : "",
          score,
          inBand,
          usage?.promptTokenCount ?? "",
          usage?.candidatesTokenCount ?? "",
          usage?.totalTokenCount ?? "",
          latency,
          csv((parsed.redFlags ?? []).join(" | ")),
          csv(parsed.summary ?? ""),
        ].join(","),
      );
    }

    const outDir = join(__dirname, "results");
    mkdirSync(outDir, { recursive: true });
    const outFile = join(outDir, `scoring-${new Date().toISOString().replace(/[:.]/g, "-")}.csv`);
    writeFileSync(outFile, rows.join("\n"), "utf8");
    console.log(`[ai:eval] total tokens=${totalTokens} · CSV → ${outFile}\n`);
  },
  120_000,
);
