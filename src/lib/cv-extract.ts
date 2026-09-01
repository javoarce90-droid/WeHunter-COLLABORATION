import mammoth from "mammoth";
import { extractText, getDocumentProxy } from "unpdf";
import { CV_MAX_BYTES } from "@/features/recruiter/candidates/schema";

/**
 * Prepara un CV para mandárselo a la IA (`draftCandidateProfile`).
 *
 * - PDF con capa de texto → se extrae el texto con `unpdf` (pdf.js serverless) y se manda como
 *   texto. Mucho más barato y rápido que mandar el PDF en base64: Gemini no tiene que hacer su
 *   propia extracción/visión (~258 tokens/página solo por el documento).
 * - PDF escaneado / sin texto seleccionable → no se pudo extraer nada útil: se manda el base64
 *   para que Gemini lo lea con visión.
 * - `.docx` → texto plano con `mammoth`.
 * - `.doc` (Word 97-2003, binario) → no se soporta: se pide convertir a PDF o `.docx`.
 *
 * Solo I/O — la autorización ya la hace la action antes de llamar acá.
 */

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const DOC_MIME = "application/msword";

/** Debajo de esto asumimos que el PDF no tiene capa de texto real (escaneado) y cae a visión. */
const MIN_PDF_TEXT_CHARS = 200;

export type CvForAi =
  | { pdf: { base64: string } }
  | { text: string }
  | { error: string };

export async function extractCvForAi(file: File): Promise<CvForAi> {
  if (file.size > CV_MAX_BYTES) {
    return { error: "El CV supera los 5 MB permitidos." };
  }

  if (file.type === "application/pdf") {
    const bytes = new Uint8Array(await file.arrayBuffer());
    try {
      const pdf = await getDocumentProxy(bytes);
      const { text } = await extractText(pdf, { mergePages: true });
      const clean = text.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
      if (clean.length >= MIN_PDF_TEXT_CHARS) return { text: clean };
    } catch {
      // PDF corrupto o que pdf.js no puede abrir → se intenta igual por visión con el base64.
    }
    return { pdf: { base64: Buffer.from(bytes).toString("base64") } };
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
