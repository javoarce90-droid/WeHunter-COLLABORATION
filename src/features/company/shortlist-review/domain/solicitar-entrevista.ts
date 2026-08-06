import { parseInterviewSlots } from "./interview-slots";

export type SolicitarEntrevistaInput = {
  token: string;
  shortlistCandidateId: string;
  /** 1 a 3 fechas/horas tentativas (ISO datetime), ver `parseInterviewSlots`. */
  slots: string[];
};

export type SolicitarEntrevistaDeps = {
  // Invoca la función SECURITY DEFINER que valida el token + pertenencia, marca el pedido
  // y notifica al equipo del reclutador. Devuelve false si la función rechazó.
  requestInterview: (args: {
    token: string;
    shortlistCandidateId: string;
    slots: Date[];
  }) => Promise<boolean>;
};

export async function solicitarEntrevista(
  input: SolicitarEntrevistaInput,
  deps: SolicitarEntrevistaDeps,
): Promise<{ ok: true } | { ok: false; error: string }> {
  // No hay contexto de usuario: la autorización la hace la función definer vía token.
  if (!input.token) {
    return { ok: false, error: "Enlace inválido." };
  }

  if (!input.shortlistCandidateId) {
    return { ok: false, error: "Candidato inválido." };
  }

  const slots = parseInterviewSlots(input.slots);
  if (!slots.ok) return slots;

  const ok = await deps.requestInterview({
    token: input.token,
    shortlistCandidateId: input.shortlistCandidateId,
    slots: slots.data,
  });

  if (!ok) {
    return { ok: false, error: "No se pudo solicitar la entrevista. El enlace puede haber vencido." };
  }

  return { ok: true };
}
