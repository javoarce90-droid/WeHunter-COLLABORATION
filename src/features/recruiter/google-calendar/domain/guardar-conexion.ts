import { ok, err, type Result } from "@/lib/result";

export type GuardarConexionInput = {
  organizationId: string;
  profileId: string;
  googleEmail: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
};

export type GuardarConexionDeps = {
  upsertConnection: (data: GuardarConexionInput) => Promise<void>;
};

/** Guarda (o reemplaza) la conexión OAuth del recruiter con Google Calendar tras el callback. */
export async function guardarConexion(
  input: GuardarConexionInput,
  deps: GuardarConexionDeps,
): Promise<Result<null>> {
  if (!input.accessToken || !input.refreshToken) {
    return err("Google no devolvió los tokens esperados. Probá reconectar.");
  }
  if (!input.googleEmail) {
    return err("No se pudo identificar la cuenta de Google.");
  }

  await deps.upsertConnection(input);
  return ok(null);
}
