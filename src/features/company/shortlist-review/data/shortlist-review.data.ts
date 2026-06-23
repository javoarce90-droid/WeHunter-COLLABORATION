import { sql } from "drizzle-orm";
import { admin } from "@/db/client";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import type { ApplicationStage } from "@/features/recruiter/applications/schema";
import type { FeedbackDecision } from "../domain/registrar-feedback";

/**
 * Acceso del actor EMPRESA (sin cuenta) a un shortlist compartido.
 *
 * Toda la autorización vive en las funciones SECURITY DEFINER de Postgres
 * (`get_shared_shortlist`, `submit_shortlist_feedback`), que validan el token y solo
 * exponen los campos permitidos. Acá invocamos esas funciones con el cliente `admin`
 * SOLO para poder ejecutarlas sin un usuario autenticado; el admin no arma queries
 * crudas sobre las tablas. Ver migración 0004 y .claude/rules/database.md.
 */

export type SharedCandidate = {
  shortlistCandidateId: string;
  fullName: string;
  email: string | null;
  cvUrl: string | null; // path en Storage; se firma aparte
  stage: ApplicationStage;
  feedbackDecision: FeedbackDecision | null;
  feedbackComment: string | null;
};

export type SharedShortlist = {
  shareId: string;
  shortlistName: string;
  jobTitle: string;
  candidates: SharedCandidate[];
};

export async function getSharedShortlist(
  token: string,
): Promise<SharedShortlist | null> {
  const rows = await admin.execute<{ result: SharedShortlist | null }>(
    sql`select get_shared_shortlist(${token}) as result`,
  );
  return rows[0]?.result ?? null;
}

export async function submitFeedbackRpc(args: {
  token: string;
  shortlistCandidateId: string;
  decision: FeedbackDecision;
  comment: string | null;
}): Promise<boolean> {
  try {
    const rows = await admin.execute<{ ok: boolean }>(
      sql`select submit_shortlist_feedback(
        ${args.token},
        ${args.shortlistCandidateId}::uuid,
        ${args.decision},
        ${args.comment}
      ) as ok`,
    );
    return rows[0]?.ok === true;
  } catch {
    // La función lanza excepción si el token es inválido/vencido o el candidato es ajeno.
    return false;
  }
}

const CV_BUCKET = "cvs";
const SIGNED_URL_TTL_SECONDS = 60 * 10; // 10 min para la vista pública

/**
 * Firma el CV de un candidato compartido. Valida el token (vía get_shared_shortlist) y que
 * el candidato pertenezca a ese shortlist ANTES de firmar. Devuelve null si no corresponde.
 */
export async function getSharedCvSignedUrl(
  token: string,
  shortlistCandidateId: string,
): Promise<string | null> {
  const shortlist = await getSharedShortlist(token);
  if (!shortlist) return null;

  const candidate = shortlist.candidates.find(
    (c) => c.shortlistCandidateId === shortlistCandidateId,
  );
  if (!candidate || !candidate.cvUrl) return null;

  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.storage
    .from(CV_BUCKET)
    .createSignedUrl(candidate.cvUrl, SIGNED_URL_TTL_SECONDS);
  if (error) return null;
  return data.signedUrl;
}
