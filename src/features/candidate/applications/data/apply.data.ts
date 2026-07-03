import { sql } from "drizzle-orm";
import { getDb } from "@/db/client";

export type ApplyResult = { applicationId: string; candidateId: string };

/**
 * Invoca apply_to_career_site_job con db.rls() (no admin): el candidato tiene sesión real,
 * a diferencia de la empresa por token — así auth.uid() adentro de la función es su
 * identidad real. Devuelve null si la función rechazó (job no disponible, Career Site
 * deshabilitado, o ya postulado) — mismo patrón que submitFeedbackRpc.
 */
export async function applyToJobRpc(args: {
  jobId: string;
  fullName: string;
  email: string;
  phone: string | null;
  coverNote: string | null;
  cvPath: string;
}): Promise<ApplyResult | null> {
  const db = await getDb();
  try {
    const rows = await db.rls(
      (tx) =>
        tx.execute<{ result: ApplyResult }>(
          sql`select apply_to_career_site_job(
            ${args.jobId}::uuid, ${args.fullName}, ${args.email},
            ${args.phone}, ${args.coverNote}, ${args.cvPath}
          ) as result`,
        ),
      "db.career-site.apply",
    );
    return rows[0]?.result ?? null;
  } catch {
    return null;
  }
}
