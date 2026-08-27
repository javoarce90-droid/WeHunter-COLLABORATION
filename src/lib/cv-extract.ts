import mammoth from "mammoth";
import { CV_MAX_BYTES } from "@/features/recruiter/candidates/schema";

/**
 * Prepara un CV para mandárselo a la IA (`draftCandidateProfile`).
 *
 * - PDF → se pasa el base64 tal cual: Gemini lo entiende nativamente, sin librería de parseo.
 * - `.docx` → se extrae el texto plano con `mammoth` y se manda como texto.
 * - `.doc` (Word 97-2003, binario) → no se soporta: se pide convertir a PDF o `.docx`.
 *
 * Solo I/O — la autorización ya la hace la action antes de llamar acá.
 */

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const DOC_MIME = "application/msword";

export type CvForAi =
  | { pdf: { base64: string } }
  | { text: string }
  | { error: string };

export async function extractCvForAi(file: File): Promise<CvForAi> {
  if (file.size > CV_MAX_BYTES) {
    return { error: "El CV supera los 5 MB permitidos." };
  }

  if (file.type === "application/pdf") {
    const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
    return { pdf: { base64 } };
  }

  if (file.type === DOCX_MIME) {
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      const { value } = await mammoth.extractRawText({ buffer });
      const text = value.trim();
      if (text.length < 30) {
        return { error: "El documento está vacío o no tiene texto legible." };
      }
      return { text };
    } catch {
      return { error: "No se pudo leer el .docx. Convertilo a PDF e intentá de nuevo." };
    }
  }

  if (file.type === DOC_MIME) {
    return { error: "El formato .doc no se puede leer. Convertilo a PDF o .docx." };
  }

  return { error: "El CV tiene que ser PDF o Word (.docx)." };
}
