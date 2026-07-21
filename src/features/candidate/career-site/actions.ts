"use server";

import { z } from "zod";
import { recordCareerSiteJobView } from "./data/career-site.data";

const inputSchema = z.object({
  slug: z.string().trim().min(1).max(100),
  jobId: z.string().uuid(),
});

/**
 * Registra una visita a un aviso del Career Site. La llama el visitante (sin sesión) desde
 * el cliente, una vez por sesión de navegador — así un refresh no infla el contador y no
 * cuentan los prefetch. Contar visitas nunca debe romper la página: cualquier fallo se traga.
 */
export async function registrarVisitaAvisoAction(slug: string, jobId: string): Promise<void> {
  const parsed = inputSchema.safeParse({ slug, jobId });
  if (!parsed.success) return;

  try {
    await recordCareerSiteJobView(parsed.data.slug, parsed.data.jobId);
  } catch {
    // no-op: es una métrica, no puede afectar al visitante.
  }
}
