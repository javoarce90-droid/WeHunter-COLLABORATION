"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getActiveMembership, getCurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/roles";
import {
  candidateInputSchema,
  candidateCreateInputSchema,
  columnMappingSchema,
  CV_ALLOWED_TYPES,
  CV_MAX_BYTES,
  IMPORT_FILE_MAX_BYTES,
  AI_CV_ALLOWED_TYPES,
} from "./schema";
import { normalizeUrl } from "@/lib/url";
import { cargarCandidato } from "./domain/cargar-candidato";
import { generarBorradorCandidato } from "./domain/generar-borrador-candidato";
import {
  procesarCvParaPool,
  type CvSource,
  type CvParaPoolOutcome,
} from "./domain/procesar-cv-para-pool";
import { extractCvForAi } from "@/lib/cv-extract";
import { insertCandidateResumeItems } from "./data/candidate-resume.mutations";
import type { DraftCandidateProfile } from "@/lib/ai";
import { editarCandidato } from "./domain/editar-candidato";
import {
  importarCandidatosMasivo,
  type ImportRowError,
} from "./domain/importar-candidatos-masivo";
import {
  cambiarEstadoTalento,
  TALENT_STATES,
  type TalentState,
} from "./domain/cambiar-estado-talento";
import {
  verificarCandidatoPorEmail,
  type VerificarCandidatoPorEmailResult,
} from "./domain/verificar-candidato-por-email";
import { agregarEtiqueta } from "./domain/agregar-etiqueta";
import { quitarEtiqueta } from "./domain/quitar-etiqueta";
import type { DuplicateCandidateMatch } from "./domain/duplicate-keys";
import {
  insertCandidate,
  insertCandidatesBatch,
  updateCandidateFields,
  setTalentState,
} from "./data/candidates.mutations";
import {
  getCandidateById,
  findDuplicateCandidate,
  findExistingEmails,
  listCandidatesForPoolMatch,
  invalidateCandidateOptionsCache,
} from "./data/candidates.queries";
import { getCandidateResume } from "./data/resume.queries";
import { getJobById } from "../jobs/data/jobs.queries";
import { getAiProvider } from "@/lib/ai";
import {
  matchearPoolConBusqueda,
  POOL_MATCH_MAX_CANDIDATES,
  type PoolMatchResult,
  type PoolMatchCache,
} from "../sourcing/domain/matchear-pool-interno";
import { getCachedPoolMatches } from "./data/pool-match-cache.queries";
import { savePoolMatchResults } from "./data/pool-match-cache.mutations";
import {
  ignorePoolCandidate,
  unignorePoolCandidate,
} from "./data/pool-match-ignored.mutations";
import { ignorarCandidatoParaBusqueda } from "../sourcing/domain/ignorar-candidato-pool";
import { getJobStatus } from "../jobs/data/jobs.queries";
import { parseCandidatesFile } from "./data/candidates-import.data";
import { findTagByName } from "./data/tags.queries";
import { insertTag, linkCandidateTag, unlinkCandidateTag } from "./data/tags.mutations";
import { findLinkableProfile } from "./data/profile-link.queries";
import {
  uploadCandidateCv,
  deleteCandidateCv,
  getCvSignedUrl,
} from "./data/candidates.storage";
import {
  insertExperience,
  updateExperience,
  deleteExperience,
  insertEducation,
  updateEducation,
  deleteEducation,
  insertCertification,
  updateCertification,
  deleteCertification,
  insertLanguage,
  updateLanguage,
  deleteLanguage,
} from "@/features/candidate/profile/data/resume.mutations";

export interface CandidateFormState {
  error?: string;
  duplicate?: DuplicateCandidateMatch;
  profileMatch?: true;
}

/** Parsea el JSON de una sección de currículum del form. Nunca tira: JSON inválido o algo
 *  que no sea un array se trata como "sin items" (no rompe el guardado del resto del form). */
function parseResumeItems(raw: FormDataEntryValue | null): Record<string, unknown>[] {
  if (typeof raw !== "string" || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Los items nuevos (agregados en esta sesión de edición, sin guardar todavía) llegan con
 *  este id temporal — ver CandidateResumeFields.tsx. Todo lo demás ya existe en la base. */
function isNewResumeItem(item: Record<string, unknown>): boolean {
  return typeof item.id === "string" && item.id.startsWith("temp-");
}

/**
 * Sincroniza una sección de currículum (experiencia/educación/certificaciones/idiomas) contra
 * lo que el reclutador dejó armado en el form: borra lo que ya no está, actualiza lo que sigue
 * (edición in-place) e inserta lo nuevo. El form siempre manda la lista COMPLETA de la sección
 * (no solo lo que cambió) — sin este diff contra `current`, cada guardado del candidato
 * reinsertaba TODO de nuevo (bug: cargar 1 estudio y guardar dos veces lo duplicaba).
 */
async function syncResumeSection<T extends { id: string }>(
  current: T[],
  submitted: Record<string, unknown>[],
  isValid: (item: Record<string, unknown>) => boolean,
  deleteOne: (id: string) => Promise<unknown>,
  insertOne: (fields: Record<string, unknown>) => Promise<unknown>,
  updateOne: (id: string, fields: Record<string, unknown>) => Promise<unknown>,
  toFields: (item: Record<string, unknown>) => Record<string, unknown>,
) {
  const keptIds = new Set(
    submitted.filter((item) => !isNewResumeItem(item)).map((item) => item.id as string),
  );
  await Promise.all(
    current.filter((item) => !keptIds.has(item.id)).map((item) => deleteOne(item.id)),
  );

  for (const item of submitted) {
    if (!isValid(item)) continue;
    if (isNewResumeItem(item)) {
      await insertOne(toFields(item));
    } else {
      await updateOne(item.id as string, toFields(item));
    }
  }
}

async function saveCandidateResumeItems(candidateId: string, formData: FormData) {
  const owner = { kind: "candidate" as const, candidateId };
  const current = await getCandidateResume(candidateId);

  await syncResumeSection(
    current.experiences,
    parseResumeItems(formData.get("experiencesJson")),
    (item) => Boolean(item.company && item.position),
    (id) => deleteExperience(id, owner),
    (fields) => insertExperience(owner, fields as never),
    (id, fields) => updateExperience(id, owner, fields as never),
    (item) => ({
      company: String(item.company),
      position: String(item.position),
      startDate: item.startDate || null,
      endDate: item.endDate || null,
      description: item.description || null,
      employmentType: item.employmentType || null,
      modality: item.modality || null,
      skills: Array.isArray(item.skills) ? item.skills : null,
    }),
  );

  await syncResumeSection(
    current.education,
    parseResumeItems(formData.get("educationJson")),
    (item) => Boolean(item.institution && item.degree),
    (id) => deleteEducation(id, owner),
    (fields) => insertEducation(owner, fields as never),
    (id, fields) => updateEducation(id, owner, fields as never),
    (item) => ({
      institution: String(item.institution),
      degree: String(item.degree),
      fieldOfStudy: item.fieldOfStudy || null,
      startDate: item.startDate || null,
      endDate: item.endDate || null,
      description: item.description || null,
      grade: item.grade || null,
      activities: item.activities || null,
    }),
  );

  await syncResumeSection(
    current.certifications,
    parseResumeItems(formData.get("certificationsJson")),
    (item) => Boolean(item.name),
    (id) => deleteCertification(id, owner),
    (fields) => insertCertification(owner, fields as never),
    (id, fields) => updateCertification(id, owner, fields as never),
    (item) => ({ name: String(item.name), url: item.url || null }),
  );

  await syncResumeSection(
    current.languages,
    parseResumeItems(formData.get("languagesJson")),
    (item) => Boolean(item.language && item.level),
    (id) => deleteLanguage(id, owner),
    (fields) => insertLanguage(owner, fields as never),
    (id, fields) => updateLanguage(id, owner, fields as never),
    (item) => ({ language: String(item.language), level: String(item.level) }),
  );
}

export async function cambiarEstadoTalentoAction(
  candidateId: string,
  talentState: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!TALENT_STATES.includes(talentState as TalentState)) {
    return { ok: false, error: "Estado inválido." };
  }

  const membership = await getActiveMembership();
  if (!membership) return { ok: false, error: "No autorizado." };

  const result = await cambiarEstadoTalento(
    { candidateId, talentState: talentState as TalentState },
    { organizationId: membership.organizationId, role: membership.role },
    { getCandidate: getCandidateById, setState: setTalentState },
  );

  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath("/candidates");
  return { ok: true };
}

export async function agregarEtiquetaAction(input: {
  candidateId: string;
  tagName: string;
  /** Solo para revalidar la vista desde donde se abrió el diálogo (pipeline/postulados). */
  jobId?: string;
}): Promise<{ ok: boolean; error?: string; tagId?: string; name?: string }> {
  const membership = await getActiveMembership();
  const result = await agregarEtiqueta(
    { candidateId: input.candidateId, tagName: input.tagName },
    { organizationId: membership?.organizationId ?? null, role: membership?.role ?? null },
    { getCandidateById, findTagByName, insertTag, linkCandidateTag },
  );
  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath("/candidates");
  if (input.jobId) {
    revalidatePath(`/jobs/${input.jobId}/pipeline`);
    revalidatePath(`/jobs/${input.jobId}/postulados`);
  }
  return { ok: true, tagId: result.data.tagId, name: result.data.name };
}

export async function quitarEtiquetaAction(input: {
  candidateId: string;
  tagId: string;
  jobId?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const membership = await getActiveMembership();
  const result = await quitarEtiqueta(
    { candidateId: input.candidateId, tagId: input.tagId },
    { organizationId: membership?.organizationId ?? null, role: membership?.role ?? null },
    { getCandidateById, unlinkCandidateTag },
  );
  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath("/candidates");
  if (input.jobId) {
    revalidatePath(`/jobs/${input.jobId}/pipeline`);
    revalidatePath(`/jobs/${input.jobId}/postulados`);
  }
  return { ok: true };
}

/**
 * Chequeo en vivo (blur del campo email, antes de completar el resto del form): adelanta el
 * mismo aviso de duplicado/cuenta vinculable que `cargarCandidato` haría recién al enviar.
 * Es solo lectura — el chequeo autoritativo sigue en el dominio al crear de verdad.
 */
export async function verificarEmailCandidatoAction(
  email: string,
): Promise<VerificarCandidatoPorEmailResult> {
  const membership = await getActiveMembership();
  return verificarCandidatoPorEmail(
    email,
    {
      organizationId: membership?.organizationId ?? null,
      role: membership?.role ?? null,
    },
    { findDuplicateCandidate, findLinkableProfile },
  );
}

/** Campos del candidato (núcleo + enriquecidos) crudos del FormData, sin validar todavía. */
function candidateFormFields(formData: FormData) {
  return {
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    headline: formData.get("headline"),
    phone: formData.get("phone"),
    location: formData.get("location"),
    linkedinUrl: formData.get("linkedinUrl"),
    summary: formData.get("summary"),
    skills: formData.get("skills"),
    seniority: formData.get("seniority"),
    source: formData.get("source"),
  };
}

/** Al editar, el email sigue opcional (no bloquear datos viejos sin email). */
function parseCandidateForm(formData: FormData) {
  return candidateInputSchema.safeParse(candidateFormFields(formData));
}

/** Al cargar un candidato nuevo, el email es obligatorio (ver schema.ts). */
function parseCreateCandidateForm(formData: FormData) {
  return candidateCreateInputSchema.safeParse(candidateFormFields(formData));
}

/** Extrae y valida el CV del FormData. Devuelve el File o null, o un mensaje de error. */
function readCvFile(
  formData: FormData,
): { file: File | null } | { error: string } {
  const raw = formData.get("cv");
  if (!(raw instanceof File) || raw.size === 0) return { file: null };
  if (!CV_ALLOWED_TYPES.includes(raw.type)) {
    return { error: "El CV debe ser PDF o Word (.doc/.docx)." };
  }
  if (raw.size > CV_MAX_BYTES) {
    return { error: "El CV supera el límite de 5 MB." };
  }
  return { file: raw };
}

export async function cargarCandidatoAction(
  _prev: CandidateFormState,
  formData: FormData,
): Promise<CandidateFormState> {
  const parsed = parseCreateCandidateForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const cv = readCvFile(formData);
  if ("error" in cv) return { error: cv.error };

  const membership = await getActiveMembership();
  const cvFile = cv.file;
  const confirmDuplicate = formData.get("confirmDuplicate") === "true";
  const linkProfile = formData.get("linkProfile") === "true";
  const skipProfileLink = formData.get("skipProfileLink") === "true";
  // Flujo "Crear con IA": el CV ya se subió al generar el borrador — se reusa ese path en vez
  // de volver a pedir el archivo.
  const existingCvUrlRaw = formData.get("existingCvUrl");
  const existingCvUrl = typeof existingCvUrlRaw === "string" ? existingCvUrlRaw : null;

  const result = await cargarCandidato(
    { ...parsed.data, confirmDuplicate, linkProfile, skipProfileLink, existingCvUrl },
    {
      organizationId: membership?.organizationId ?? null,
      role: membership?.role ?? null,
    },
    {
      findDuplicateCandidate,
      findLinkableProfile,
      insertCandidate,
      ...(cvFile && membership
        ? {
            uploadCv: () => uploadCandidateCv(membership.organizationId, cvFile),
            deleteCv: deleteCandidateCv,
          }
        : {}),
    },
  );
  if (!result.ok) {
    return { error: result.error, duplicate: result.duplicate, profileMatch: result.profileMatch };
  }
  if (membership) invalidateCandidateOptionsCache(membership.organizationId);

  await saveCandidateResumeItems(result.data.candidateId, formData);

  redirect("/candidates");
}

// ---- Crear candidato con IA desde el CV ----

export interface BorradorCandidatoState {
  error?: string;
  draft?: DraftCandidateProfile;
  /** Path del CV ya subido a Storage en este paso — se reusa en el guardado. */
  cvUrl?: string;
  cvDownloadUrl?: string | null;
}

/** Valida un CV para el flujo con IA (PDF o .docx). Devuelve el File o un mensaje de error. */
function readAiCvFile(formData: FormData): { file: File } | { error: string } {
  const raw = formData.get("cv");
  if (!(raw instanceof File) || raw.size === 0) {
    return { error: "Subí el CV en PDF o .docx." };
  }
  if (!AI_CV_ALLOWED_TYPES.includes(raw.type)) {
    return { error: "El asistente acepta CV en PDF o .docx. Convertí el archivo e intentá de nuevo." };
  }
  if (raw.size > CV_MAX_BYTES) {
    return { error: "El CV supera el límite de 5 MB." };
  }
  return { file: raw };
}

function cvSourceFromExtract(
  extracted: Awaited<ReturnType<typeof extractCvForAi>>,
): CvSource | null {
  if ("pdf" in extracted) {
    return { cvFile: { base64: extracted.pdf.base64, mimeType: "application/pdf" } };
  }
  if ("text" in extracted) return { cvText: extracted.text };
  return null;
}

/**
 * Genera un borrador de candidato con IA a partir de un CV (+ LinkedIn opcional). No persiste
 * el candidato — el recruiter revisa/edita el borrador en el formulario y recién ahí guarda.
 * El CV sí se sube a Storage acá, para no volver a pedir el archivo en el paso de revisión.
 */
export async function generarBorradorCandidatoConIaAction(
  _prev: BorradorCandidatoState,
  formData: FormData,
): Promise<BorradorCandidatoState> {
  const membership = await getActiveMembership();
  if (!membership) return { error: "No autorizado." };

  const linkedinUrlRaw = formData.get("linkedinUrl");
  const linkedinUrl =
    typeof linkedinUrlRaw === "string" && linkedinUrlRaw.trim()
      ? normalizeUrl(linkedinUrlRaw)
      : "";

  // El CV es obligatorio — la URL de LinkedIn sola no da nada que analizar de forma fiable.
  const cv = readAiCvFile(formData);
  if ("error" in cv) return { error: cv.error };

  const extracted = await extractCvForAi(cv.file);
  if ("error" in extracted) return { error: extracted.error };
  const cvSource = cvSourceFromExtract(extracted) ?? undefined;

  let uploaded: { path: string } | null = null;
  try {
    uploaded = await uploadCandidateCv(membership.organizationId, cv.file);
  } catch {
    return { error: "No se pudo subir el CV. Revisá el archivo e intentá de nuevo." };
  }

  const result = await generarBorradorCandidato(
    {
      linkedinUrl: linkedinUrl || undefined,
      cvFile: cvSource && "cvFile" in cvSource ? cvSource.cvFile : undefined,
      cvText: cvSource && "cvText" in cvSource ? cvSource.cvText : undefined,
    },
    { organizationId: membership.organizationId, role: membership.role },
    { draftProfile: (input) => getAiProvider().draftCandidateProfile(input) },
  );

  if (!result.ok) {
    if (uploaded) await deleteCandidateCv(uploaded.path).catch(() => {});
    return { error: result.error };
  }

  return {
    draft: result.data,
    cvUrl: uploaded?.path,
    cvDownloadUrl: uploaded ? await getCvSignedUrl(uploaded.path) : null,
  };
}

export type ProcesarCvState = { fileName: string; outcome: CvParaPoolOutcome };

/**
 * Procesa UN CV del lote: extrae, lo sube, la IA arma el perfil y se crea el candidato (sin
 * revisión). El cliente (`CvBatchProgressDialog`) llama esta action una vez por CV, con
 * concurrencia limitada, para mostrar progreso por archivo. Nunca tira: devuelve un outcome.
 */
export async function procesarUnCvParaPoolAction(formData: FormData): Promise<ProcesarCvState> {
  const raw = formData.get("cv");
  const fileName = raw instanceof File ? raw.name : "CV";

  const membership = await getActiveMembership();
  if (!membership || !can(membership.role, "candidates.manage")) {
    return { fileName, outcome: { status: "failed", reason: "Sin permisos para cargar candidatos." } };
  }

  const cv = readAiCvFile(formData);
  if ("error" in cv) return { fileName, outcome: { status: "failed", reason: cv.error } };

  const extracted = await extractCvForAi(cv.file);
  if ("error" in extracted) {
    return { fileName, outcome: { status: "failed", reason: extracted.error } };
  }
  const cvSource = cvSourceFromExtract(extracted);
  if (!cvSource) {
    return { fileName, outcome: { status: "failed", reason: "No se pudo preparar el CV." } };
  }
  // El CV se guarda adjunto al candidato; si la subida falla, se crea igual sin archivo.
  const uploaded = await uploadCandidateCv(membership.organizationId, cv.file).catch(() => null);

  const outcome = await procesarCvParaPool(
    { cv: cvSource, cvUrl: uploaded?.path ?? null },
    { organizationId: membership.organizationId, role: membership.role },
    {
      draftProfile: (src) =>
        getAiProvider().draftCandidateProfile(
          "cvFile" in src ? { cvFile: src.cvFile } : { cvText: src.cvText },
        ),
      cargarCandidato: (input) =>
        cargarCandidato(
          input,
          { organizationId: membership.organizationId, role: membership.role },
          { findDuplicateCandidate, findLinkableProfile, insertCandidate },
        ),
      persistResume: insertCandidateResumeItems,
    },
  );

  if (outcome.status === "created") {
    invalidateCandidateOptionsCache(membership.organizationId);
    revalidatePath("/candidates");
  }
  return { fileName, outcome };
}

export async function editarCandidatoAction(
  _prev: CandidateFormState,
  formData: FormData,
): Promise<CandidateFormState> {
  const candidateId = String(formData.get("candidateId") ?? "");
  const parsed = parseCandidateForm(formData);
  if (!candidateId) return { error: "Falta el candidato a editar." };
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const cv = readCvFile(formData);
  if ("error" in cv) return { error: cv.error };

  const membership = await getActiveMembership();
  const cvFile = cv.file;

  // Si se reemplaza el CV, necesitamos el path actual (autoritativo del server, no del
  // cliente) para borrarlo tras el reemplazo. Una sola lectura, solo cuando hay CV nuevo.
  let currentCvUrl: string | null = null;
  if (cvFile && membership) {
    const existing = await getCandidateById(candidateId, membership.organizationId);
    currentCvUrl = existing?.cvUrl ?? null;
  }

  const result = await editarCandidato(
    { candidateId, ...parsed.data, currentCvUrl },
    {
      organizationId: membership?.organizationId ?? null,
      role: membership?.role ?? null,
    },
    {
      updateCandidateFields,
      ...(cvFile && membership
        ? {
            uploadCv: () => uploadCandidateCv(membership.organizationId, cvFile),
            deleteCv: deleteCandidateCv,
          }
        : {}),
    },
  );
  if (!result.ok) {
    return { error: result.error };
  }

  await saveCandidateResumeItems(candidateId, formData);

  redirect("/candidates");
}

// ---- Importación masiva ----

const IMPORT_EXT_RE = /\.(csv|xlsx|xls)$/i;

function readImportFile(formData: FormData): { file: File } | { error: string } {
  const raw = formData.get("file");
  if (!(raw instanceof File) || raw.size === 0) {
    return { error: "Subí un archivo CSV o Excel." };
  }
  if (!IMPORT_EXT_RE.test(raw.name)) {
    return { error: "El archivo debe ser .csv, .xlsx o .xls." };
  }
  if (raw.size > IMPORT_FILE_MAX_BYTES) {
    return { error: "El archivo supera el límite de 5 MB." };
  }
  return { file: raw };
}

export interface ImportPreviewState {
  ok?: boolean;
  error?: string;
  headers?: string[];
  totalRows?: number;
  sample?: Record<string, string>[];
}

/** Primer paso: parsea el archivo y devuelve sus columnas para que el recruiter las mapee.
 *  No importa nada todavía — es de solo lectura del archivo subido. */
export async function previsualizarImportacionAction(
  _prev: ImportPreviewState,
  formData: FormData,
): Promise<ImportPreviewState> {
  const membership = await getActiveMembership();
  if (!membership || !can(membership.role, "candidates.manage")) {
    return { error: "No tenés permisos para cargar candidatos." };
  }

  const file = readImportFile(formData);
  if ("error" in file) return { error: file.error };

  const parsed = await parseCandidatesFile(file.file);
  if (!parsed.ok) return { error: parsed.error };

  return {
    ok: true,
    headers: parsed.headers,
    totalRows: parsed.rows.length,
    sample: parsed.rows.slice(0, 5),
  };
}

export interface ImportResultState {
  ok?: boolean;
  error?: string;
  imported?: number;
  skipped?: number;
  errors?: ImportRowError[];
}

/** Segundo paso: recibe el mismo archivo + el mapeo de columnas que confirmó el recruiter,
 *  y ahí sí importa. Se reparsea el archivo (llega de nuevo en el FormData) en vez de guardar
 *  las filas parseadas entre pasos — evita mantener estado de sesión para esto. */
export async function importarCandidatosMasivoAction(
  _prev: ImportResultState,
  formData: FormData,
): Promise<ImportResultState> {
  const file = readImportFile(formData);
  if ("error" in file) return { error: file.error };

  const mappingParsed = columnMappingSchema.safeParse({
    fullName: formData.get("map_fullName"),
    email: formData.get("map_email"),
    phone: formData.get("map_phone"),
    location: formData.get("map_location"),
    linkedinUrl: formData.get("map_linkedinUrl"),
    headline: formData.get("map_headline"),
    skills: formData.get("map_skills"),
  });
  if (!mappingParsed.success) {
    return { error: mappingParsed.error.issues[0]?.message ?? "Mapeo de columnas inválido." };
  }

  const parsed = await parseCandidatesFile(file.file);
  if (!parsed.ok) return { error: parsed.error };

  const membership = await getActiveMembership();
  const result = await importarCandidatosMasivo(
    { rows: parsed.rows, mapping: mappingParsed.data },
    {
      organizationId: membership?.organizationId ?? null,
      role: membership?.role ?? null,
    },
    { findExistingEmails, insertCandidatesBatch },
  );
  if (!result.ok) return { error: result.error };
  if (membership) invalidateCandidateOptionsCache(membership.organizationId);

  revalidatePath("/candidates");
  return { ok: true, ...result.data };
}

// ---- Matchear pool con IA contra una búsqueda (sourcing interno) ----

/**
 * Elige una búsqueda y matchea con IA hasta `POOL_MATCH_MAX_CANDIDATES` candidatos del pool
 * interno ya prefiltrados por skills/seniority del puesto (`listCandidatesForPoolMatch`) —
 * mismo contrato de IA que Postulados y Sourcing externo, ver `matchear-pool-interno.ts`.
 */
export async function matchearPoolConBusquedaAction(jobId: string): Promise<{
  ok: boolean;
  results?: PoolMatchResult[];
  poolFiltrado?: number;
  error?: string;
}> {
  const membership = await getActiveMembership();
  if (!membership) return { ok: false, error: "No autorizado." };
  if (!can(membership.role, "candidates.manage")) {
    return { ok: false, error: "Tu rol no permite usar sourcing." };
  }

  const job = await getJobById(jobId, membership.organizationId);
  if (!job) return { ok: false, error: "Búsqueda no encontrada." };

  const candidatos = await listCandidatesForPoolMatch(
    membership.organizationId,
    { id: job.id, skills: job.skills, seniority: job.seniority },
    POOL_MATCH_MAX_CANDIDATES,
  );
  // Sin candidatos que pasen el prefiltro: es un resultado válido (el pool no tiene nadie con
  // esos skills/seniority), no un error — cae en el empty-state de la UI en vez de un toast
  // que se pierde sin dejar ningún rastro persistente.
  if (candidatos.length === 0) {
    return { ok: true, results: [], poolFiltrado: 0 };
  }

  const provider = getAiProvider();
  const cache: PoolMatchCache = {
    getCached: (jobId, candidateIds) =>
      getCachedPoolMatches(membership.organizationId, jobId, candidateIds),
    save: (jobId, jobUpdatedAt, entries) =>
      savePoolMatchResults(membership.organizationId, jobId, jobUpdatedAt, entries),
  };
  const results = await matchearPoolConBusqueda(
    {
      id: job.id,
      updatedAt: job.updatedAt,
      title: job.title,
      position: job.position,
      skills: job.skills,
      objectives: job.objectives,
      requirements: job.requirements,
      responsibilities: job.responsibilities,
    },
    candidatos,
    provider,
    cache,
  );

  return { ok: true, results, poolFiltrado: candidatos.length };
}

/**
 * "Ignorar" / "Dejar de ignorar" un candidato del pool para una búsqueda puntual (botón en
 * Matchear con IA). No lo saca del pool ni de otras búsquedas — solo hace que no reaparezca en
 * el match de ESA búsqueda. Reversible (para el "Deshacer" del toast).
 */
export async function ignorarCandidatoPoolAction(
  jobId: string,
  candidateId: string,
  ignorar: boolean,
): Promise<{ ok: boolean; ignorado?: boolean; error?: string }> {
  const [user, membership] = await Promise.all([
    getCurrentUser(),
    getActiveMembership(),
  ]);
  if (!membership) return { ok: false, error: "No autorizado." };

  const res = await ignorarCandidatoParaBusqueda(
    { jobId, candidateId, ignorar },
    {
      role: membership.role,
      organizationId: membership.organizationId,
      userId: user?.id ?? null,
    },
    {
      jobExists: async (id) =>
        (await getJobStatus(id, membership.organizationId)) !== null,
      ignore: (id, cid, by) =>
        ignorePoolCandidate(membership.organizationId, id, cid, by),
      unignore: (id, cid) =>
        unignorePoolCandidate(membership.organizationId, id, cid),
    },
  );
  if (!res.ok) return { ok: false, error: res.error };
  return { ok: true, ignorado: res.data.ignorado };
}
