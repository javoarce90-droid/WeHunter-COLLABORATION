import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

/**
 * Config aparte para el harness de evaluación de IA (`pnpm ai:eval`). Pega a la API real de
 * Gemini y NO debe correr con `pnpm test`. Por eso vive en su propio config e include, separado
 * del suite de casos de uso.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/lib/ai/eval/**/*.eval.ts"],
    testTimeout: 120_000,
  },
});
