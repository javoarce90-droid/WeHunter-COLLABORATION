import { ok, err, type Result } from "@/lib/result";

export interface CompletarDatosMinimosInput {
  phone?: string;
  location?: string;
  cvUrl?: string;
  hasExistingCv: boolean;
}

export interface CompletarDatosMinimosCtx {
  userId: string | null;
}

export interface CompletarDatosMinimosDeps {
  updateMinimum: (
    userId: string,
    fields: { phone: string; location: string; cvUrl?: string },
  ) => Promise<void>;
}

export async function completarDatosMinimos(
  input: CompletarDatosMinimosInput,
  ctx: CompletarDatosMinimosCtx,
  deps: CompletarDatosMinimosDeps,
): Promise<Result<{ userId: string }>> {
  if (!ctx.userId) {
    return err("Necesitás estar autenticado para completar tu perfil.");
  }

  const phone = input.phone?.trim() ?? "";
  const location = input.location?.trim() ?? "";
  if (!phone) return err("Ingresá tu teléfono.");
  if (!location) return err("Ingresá tu ubicación.");
  if (!input.cvUrl && !input.hasExistingCv) return err("Cargá tu CV.");

  await deps.updateMinimum(ctx.userId, { phone, location, cvUrl: input.cvUrl });

  return ok({ userId: ctx.userId });
}
