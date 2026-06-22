import { defineConfig } from "drizzle-kit";

/**
 * Para migraciones (DDL) conviene la conexión DIRECTA de Supabase (puerto :5432),
 * no el transaction pooler. El pooler es para la app en runtime; las migraciones
 * usan DIRECT_DATABASE_URL. Ver .env.example.
 */
export default defineConfig({
  schema: "./src/db/schema/index.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  casing: "snake_case",
  dbCredentials: {
    url: process.env.DIRECT_DATABASE_URL!,
  },
});
