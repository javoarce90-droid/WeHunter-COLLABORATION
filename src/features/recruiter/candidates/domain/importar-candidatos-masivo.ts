import { can } from "@/lib/auth/roles";
import type { OrgRole } from "@/lib/auth/session";
import { normalizeEmailKey } from "./duplicate-keys";

/**
 * Caso de uso: importación masiva de candidatos desde un archivo CSV/Excel que el recruiter
 * ya tiene armado (backlog QA ago 2026, prioridad pre-lanzamiento: sin esto, migrar una base
 * existente a WeHunter obliga a cargar candidato por candidato).
 *
 * No asume que las columnas del archivo coinciden con los campos del candidato — el recruiter
 * mapea qué columna es cuál (`ColumnMapping`) antes de importar. El parseo del archivo en sí
 * (CSV/XLSX → filas) vive en `data/` (es I/O de formato, no regla de negocio); acá solo entran
 * filas ya parseadas como objetos `{ [header]: valor }`.
 */

const MAX_ROWS = 1000;

export type ImportRow = Record<string, string>;

export type ColumnMapping = {
  fullName: string;
  email: string;
  phone?: string;
  location?: string;
  linkedinUrl?: string;
  headline?: string;
  skills?: string;
};

export type ImportRowError = {
  row: number; // 1-based, contando la fila de encabezados como fila 1 (ver UI: "fila N del archivo")
  fullName: string | null;
  error: string;
};

export type CandidateToInsert = {
  fullName: string;
  email: string;
  phone: string | null;
  location: string | null;
  linkedinUrl: string | null;
  headline: string | null;
  skills: string[] | null;
};

export interface ImportarCandidatosMasivoCtx {
  organizationId: string | null;
  role: OrgRole | null;
}

export interface ImportarCandidatosMasivoDeps {
  /** Una sola query por todo el archivo (nunca N+1) — devuelve los emails (normalizados,
   *  minúscula) que ya existen en el pool de la organización. */
  findExistingEmails(organizationId: string, emails: string[]): Promise<Set<string>>;
  /** Un solo insert en lote para todas las filas válidas. */
  insertCandidatesBatch(
    organizationId: string,
    candidatesToInsert: CandidateToInsert[],
  ): Promise<{ inserted: number }>;
}

export type ImportarCandidatosMasivoResult =
  | {
      ok: true;
      data: { imported: number; skipped: number; errors: ImportRowError[] };
    }
  | { ok: false; error: string };

const cell = (row: ImportRow, column?: string): string => {
  if (!column) return "";
  return (row[column] ?? "").trim();
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function importarCandidatosMasivo(
  input: { rows: ImportRow[]; mapping: ColumnMapping },
  ctx: ImportarCandidatosMasivoCtx,
  deps: ImportarCandidatosMasivoDeps,
): Promise<ImportarCandidatosMasivoResult> {
  if (!ctx.organizationId || !ctx.role) {
    return { ok: false, error: "Necesitás estar autenticado en un workspace." };
  }
  if (!can(ctx.role, "candidates.manage")) {
    return { ok: false, error: "No tenés permisos para cargar candidatos." };
  }
  if (!input.mapping.fullName || !input.mapping.email) {
    return { ok: false, error: "Falta indicar qué columna es el nombre y cuál el email." };
  }
  if (input.rows.length === 0) {
    return { ok: false, error: "El archivo no tiene filas para importar." };
  }
  if (input.rows.length > MAX_ROWS) {
    return {
      ok: false,
      error: `El archivo tiene ${input.rows.length} filas — el máximo por importación es ${MAX_ROWS}. Dividilo en partes más chicas.`,
    };
  }

  const errors: ImportRowError[] = [];
  const candidatesToInsert: CandidateToInsert[] = [];
  const emailsInFile = new Set<string>();

  input.rows.forEach((row, idx) => {
    const rowNumber = idx + 2; // +1 por 1-based, +1 por la fila de encabezados
    const fullName = cell(row, input.mapping.fullName);
    const rawEmail = cell(row, input.mapping.email);
    const email = normalizeEmailKey(rawEmail);

    if (fullName.length < 2) {
      errors.push({ row: rowNumber, fullName: fullName || null, error: "Falta el nombre." });
      return;
    }
    if (!email || !EMAIL_RE.test(email)) {
      errors.push({ row: rowNumber, fullName, error: "Email inválido o vacío." });
      return;
    }
    if (emailsInFile.has(email)) {
      errors.push({ row: rowNumber, fullName, error: "Email duplicado dentro del archivo." });
      return;
    }
    emailsInFile.add(email);

    const skillsRaw = cell(row, input.mapping.skills);
    candidatesToInsert.push({
      fullName,
      email,
      phone: cell(row, input.mapping.phone) || null,
      location: cell(row, input.mapping.location) || null,
      linkedinUrl: cell(row, input.mapping.linkedinUrl) || null,
      headline: cell(row, input.mapping.headline) || null,
      skills: skillsRaw
        ? skillsRaw.split(",").map((s) => s.trim()).filter(Boolean)
        : null,
    });
  });

  // Una sola query por TODOS los emails válidos, no una por fila (database.md regla #3/#6).
  const existing =
    candidatesToInsert.length > 0
      ? await deps.findExistingEmails(
          ctx.organizationId,
          candidatesToInsert.map((c) => c.email),
        )
      : new Set<string>();

  const toInsert = candidatesToInsert.filter((c) => {
    if (existing.has(c.email)) {
      const rowNumber = input.rows.findIndex(
        (r) => normalizeEmailKey(cell(r, input.mapping.email)) === c.email,
      ) + 2;
      errors.push({
        row: rowNumber,
        fullName: c.fullName,
        error: "Ya existe un candidato con ese email en tu pool.",
      });
      return false;
    }
    return true;
  });

  const { inserted } =
    toInsert.length > 0
      ? await deps.insertCandidatesBatch(ctx.organizationId, toInsert)
      : { inserted: 0 };

  return {
    ok: true,
    data: { imported: inserted, skipped: errors.length, errors },
  };
}
