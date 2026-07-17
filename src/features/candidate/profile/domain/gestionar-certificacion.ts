import { ok, err, type Result } from "@/lib/result";
import { normalizeUrl } from "@/lib/url";
import type { ResumeOwner } from "./gestionar-experiencia";

export type { ResumeOwner };

export interface CertificacionInput {
  name: string;
  url?: string;
}

export interface NormalizedCertificacion {
  name: string;
  url: string | null;
}

/** Exportada para reusar la misma validación desde completarOnboardingConIa (onboarding con IA). */
export function normalizeCertificacion(input: CertificacionInput): Result<NormalizedCertificacion> {
  const name = input.name.trim();
  if (!name) return err("El nombre del certificado es obligatorio.");

  return ok({ name, url: normalizeUrl(input.url ?? "") || null });
}

export interface AgregarCertificacionDeps {
  insertCertification: (
    owner: ResumeOwner,
    data: NormalizedCertificacion,
  ) => Promise<{ id: string }>;
}

export async function agregarCertificacion(
  input: CertificacionInput,
  owner: ResumeOwner,
  deps: AgregarCertificacionDeps,
): Promise<Result<{ id: string }>> {
  const normalized = normalizeCertificacion(input);
  if (!normalized.ok) return normalized;

  const created = await deps.insertCertification(owner, normalized.data);
  return ok({ id: created.id });
}

export interface EliminarCertificacionDeps {
  deleteCertification: (id: string, owner: ResumeOwner) => Promise<boolean>;
}

export async function eliminarCertificacion(
  id: string,
  owner: ResumeOwner,
  deps: EliminarCertificacionDeps,
): Promise<Result<{ id: string }>> {
  const deleted = await deps.deleteCertification(id, owner);
  if (!deleted) return err("No se encontró el certificado o no te pertenece.");
  return ok({ id });
}
