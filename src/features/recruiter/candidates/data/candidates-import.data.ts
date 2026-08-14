import * as XLSX from "xlsx";
import type { ImportRow } from "../domain/importar-candidatos-masivo";

/**
 * Parseo de archivos CSV/XLSX subidos para la importación masiva. Es I/O de formato, no
 * regla de negocio — por eso vive en `data/` y no en `domain/` (que solo recibe filas ya
 * parseadas). `XLSX.read` de SheetJS entiende ambos formatos sin distinguirlos: alcanza con
 * los bytes del archivo, no hace falta ramificar por extensión.
 */

export type ParsedFile =
  | { ok: true; headers: string[]; rows: ImportRow[] }
  | { ok: false; error: string };

export async function parseCandidatesFile(file: File): Promise<ParsedFile> {
  let buffer: ArrayBuffer;
  try {
    buffer = await file.arrayBuffer();
  } catch {
    return { ok: false, error: "No se pudo leer el archivo." };
  }

  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: "array" });
  } catch {
    return { ok: false, error: "El archivo no es un CSV o Excel válido." };
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return { ok: false, error: "El archivo no tiene ninguna hoja con datos." };
  const sheet = workbook.Sheets[sheetName]!;

  // `defval: ""` para que una celda vacía sea "" (no ausente) — el dominio espera todas las
  // columas presentes en cada fila, aunque estén vacías.
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  if (raw.length === 0) {
    return { ok: false, error: "El archivo no tiene filas de datos (¿solo tiene encabezados?)." };
  }

  const headers = Object.keys(raw[0]!);
  const rows: ImportRow[] = raw.map((r) => {
    const row: ImportRow = {};
    for (const h of headers) row[h] = String(r[h] ?? "").trim();
    return row;
  });

  return { ok: true, headers, rows };
}
