import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Skills vendorizados (impeccable, etc.): no son código del proyecto, no los
    // linteamos para no inundar el CI de warnings.
    ".claude/skills/**",
    ".github/skills/**",
  ]),
]);

export default eslintConfig;
