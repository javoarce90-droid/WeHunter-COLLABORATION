import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * Config de Vitest. Los tests de casos de uso (domain/) corren sin levantar Next ni la
 * base. Mapea el alias `@/` para que resuelva igual que en la app.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
