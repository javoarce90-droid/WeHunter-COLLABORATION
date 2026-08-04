import { sql } from "drizzle-orm";
import { getDb } from "@/db/client";

export type ApplyResult = { applicationId: string; candidateId: string };

/** Motivo del rechazo de la función definer, para que el dominio dé un mensaje útil. */
export type ApplyFailure =
  | { reason: "screening"; faltantes: string }
  | { reason: "unavailable" };

export type ApplyOutcome = { ok: true; data: ApplyResult } | ({ ok: false } & ApplyFailure);

/**
 * Invoca apply_to_career_site_job con db.rls() (no admin): el candidato tiene sesión real,
 * a diferencia de la empresa por token — así auth.uid() adentro de la función es su
 * identidad real.
 *
 * La función distingue el rechazo por preguntas obligatorias sin responder con el prefijo
 * `screening:` en el mensaje (ver migración 0056). Cualquier otro rechazo (job no
 * disponible, Career Site deshabilitado, ya postulado) cae en "unavailable".
 */
export async function applyToJobRpc(args: {
  jobId: string;
  fullName: string;
  email: string;
  phone: string | null;
  coverNote: string | null;
  cvPath: string | null;
  expectedSalary: number | null;
  expectedSalaryCurrency: string | null;
  screeningAnswers: { questionId: string; value: string }[];
}): Promise<ApplyOutcome> {
  const db = await getDb();
  try {
    const rows = await db.rls(
      (tx) =>
        tx.execute<{ result: ApplyResult }>(
          sql`select apply_to_career_site_job(
            ${args.jobId}::uuid, ${args.fullName}, ${args.email},
            ${args.phone}, ${args.coverNote}, ${args.cvPath},
            ${JSON.stringify(args.screeningAnswers)}::jsonb,
            ${args.expectedSalary}, ${args.expectedSalaryCurrency}
          ) as result`,
        ),
      "db.career-site.apply",
    );
    const data = rows[0]?.result;
    return data ? { ok: true, data } : { ok: false, reason: "unavailable" };
  } catch (e) {
    const message = e instanceof Error ? e.message : "";
    const screening = message.match(/screening: faltan respuestas obligatorias \((.+)\)/);
    if (screening) {
      return { ok: false, reason: "screening", faltantes: screening[1] ?? "" };
    }
    return { ok: false, reason: "unavailable" };
  }
}
