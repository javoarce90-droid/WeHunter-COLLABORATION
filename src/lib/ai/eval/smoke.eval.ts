import { readFileSync } from "node:fs";
import { join } from "node:path";

import { expect, test } from "vitest";

import { GeminiAiProvider } from "@/lib/ai/gemini";

/**
 * Smoke test end-to-end del proveedor real (Gemini, con la cascada de modelos y el parsing de
 * `GeminiAiProvider` — no el SDK crudo como scoring.eval.ts). Corre con `pnpm ai:eval`, NO con
 * `pnpm test`. Sirve para confirmar de un vistazo, tras tocar prompts/modelo/env, que:
 *   1. la API key funciona y no hay 429,
 *   2. draftJobOffer INTERPRETA el rol (skills reales, no palabras sueltas del brief) — el bug
 *      que reportó el cliente con "Data Engineer Sr",
 *   3. interviewReport EXTRAE los datos presentes en las notas en vez de poner "No informado".
 */

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

const env = { ...loadEnv(), ...process.env };
const apiKey = env.GEMINI_API_KEY;
const models = [
  env.GEMINI_MODEL || env.GEMINI_MODEL_PRIMARY || "gemini-flash-latest",
  env.GEMINI_MODEL_FALLBACK || "gemini-pro-latest",
];

// Palabras que NO son skills: si aparecen, el modelo está tokenizando el brief en vez de interpretar.
const NON_SKILLS = new Set([
  "data",
  "engineer",
  "senior",
  "sr",
  "buscamos",
  "para",
  "diseñar",
  "un",
  "una",
  "de",
  "que",
]);

test.skipIf(!apiKey)(
  "draftJobOffer interpreta el rol: skills reales, no palabras del brief",
  async () => {
    const ai = new GeminiAiProvider(apiKey!, models);
    const draft = await ai.draftJobOffer({
      name: "Data Engineer Sr",
      brief: "Buscamos un data engineer senior para diseñar y mantener pipelines de datos.",
      modality: "Híbrido",
      seniority: "Senior",
      workDay: "Full time",
    });

    console.log("\n[smoke] draftJobOffer →", JSON.stringify(draft, null, 2), "\n");

    expect(draft.position.toLowerCase()).toContain("data");
    expect(draft.skills.length).toBeGreaterThanOrEqual(4);
    const leaked = draft.skills.filter((s) => NON_SKILLS.has(s.trim().toLowerCase()));
    expect(leaked, `skills con palabras del brief: ${leaked.join(", ")}`).toHaveLength(0);
    // Un Data Engineer real menciona al menos alguna de estas.
    const known = ["python", "sql", "spark", "airflow", "dbt", "etl", "aws", "gcp", "kafka"];
    const hit = draft.skills.some((s) => known.includes(s.trim().toLowerCase()));
    expect(hit, `skills=${draft.skills.join(", ")}`).toBe(true);
    expect(draft.requirements.length).toBeGreaterThan(80);
    expect(draft.responsibilities.length).toBeGreaterThan(80);
  },
  120_000,
);

test.skipIf(!apiKey)(
  "scoreApplicationsBatch: un resultado por candidato, scores diferenciados",
  async () => {
    const ai = new GeminiAiProvider(apiKey!, models);
    const job = {
      title: "React Senior",
      position: "Frontend Senior",
      skills: ["React", "TypeScript", "Next.js"],
      objectives: null,
      requirements: null,
      responsibilities: null,
    };
    const candidates = [
      { id: "react-dev", skills: ["React", "TypeScript", "Next.js"], summary: "6 años en frontend con React y Next.js", source: "linkedin", experience: [], education: [] },
      { id: "backend-py", skills: ["Python", "Django"], summary: "Backend Python, algo de React", source: "linkedin", experience: [], education: [] },
      { id: "qa-manual", skills: ["Testing manual"], summary: "QA manual, sin experiencia de desarrollo", source: "linkedin", experience: [], education: [] },
      { id: "vacio", skills: null, summary: null, source: null, experience: [], education: [] },
    ];
    const t0 = Date.now();
    const results = await ai.scoreApplicationsBatch({ job, candidates });
    console.log(`\n[smoke] scoreApplicationsBatch (${Date.now() - t0}ms) →`,
      results.map((r) => `${r.candidateId}=${r.score}`).join(" "), "\n");

    expect(results).toHaveLength(candidates.length);
    const byId = new Map(results.map((r) => [r.candidateId, r]));
    for (const c of candidates) expect(byId.has(c.id)).toBe(true);
    expect(byId.get("react-dev")!.score).toBeGreaterThan(byId.get("qa-manual")!.score);
    expect(byId.get("react-dev")!.score).toBeGreaterThan(byId.get("vacio")!.score);
  },
  120_000,
);

test.skipIf(!apiKey)(
  "interviewReport extrae los datos presentes en las notas",
  async () => {
    const ai = new GeminiAiProvider(apiKey!, models);
    const result = await ai.interviewReport({
      candidateName: "Lucía Gómez",
      jobTitle: "Product Designer Sr",
      interviewerName: "Javier",
      interviewDate: "12 de agosto de 2026",
      sourceText: [
        "Vive en Rosario, se quiere mudar a Buenos Aires si el rol lo requiere.",
        "Estudió Diseño Gráfico en la UBA. Inglés intermedio.",
        "Última remu: USD 2.200. Pretensión salarial: 2500 USD netos mensuales.",
        "Disponibilidad: puede arrancar en 3 semanas (tiene que dar preaviso). Para entrevistas cualquier día por la tarde.",
        "8 años de experiencia. En Mercado Pago (2021-hoy) lidera un equipo de 4 diseñadores; antes en Auth0 (2018-2021) como product designer con React y Storybook.",
        "Fuerte en design systems y research. Mostró un caso de rediseño de onboarding que bajó el drop-off 22%. Está estudiando Figma variables y motion design.",
        "A validar: experiencia con herramientas de prototipado avanzado, no quedó claro su nivel de Figma variables.",
        "Motivación: busca más impacto en producto y menos gestión pura.",
      ].join("\n"),
    });

    console.log("\n[smoke] interviewReport →", JSON.stringify(result, null, 2), "\n");

    expect(result.ubicacion.toLowerCase()).toContain("rosario");
    expect(result.estudios.toLowerCase()).toMatch(/dise|uba/);
    expect(result.ultimaRemuneracion).toMatch(/2\.?200|2200/);
    expect(result.remuneracionPretendida).toMatch(/2\.?500|2500/);
    expect(result.disponibilidadIngreso.toLowerCase()).toMatch(/semana/);
    expect(result.experienciaRelevante.toLowerCase()).toMatch(/mercado pago|auth0/);
    expect(result.stackConocimientos.toLowerCase()).toMatch(/design system|research/);
    expect(result.fortalezas.length).toBeGreaterThanOrEqual(1);
    expect(result.aspectosAValidar.join(" ").toLowerCase()).toMatch(/figma|prototip/);
    expect(["avanzar", "continuar_evaluando", "no_avanzar"]).toContain(result.recommendation);
  },
  120_000,
);
