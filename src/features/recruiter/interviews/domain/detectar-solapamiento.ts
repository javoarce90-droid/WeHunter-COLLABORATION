/** No hay campo de duración en el schema — las entrevistas se agendan para ~1 hora (pedido
 *  explícito del usuario, 2026-08-28), así que el solapamiento se estima con esa duración fija
 *  para todas, no una real por entrevista. */
export const INTERVIEW_DURATION_MINUTES = 60;

export type SolapamientoCandidate = {
  id: string;
  scheduledAt: Date;
  candidateName: string;
  status: string;
};

/** Entrevistas de `others` cuyo horario se solapa con `scheduledAt` (ventanas de ~1h). Excluye
 *  las canceladas (no compiten por el horario) y, al editar una entrevista existente,
 *  `excludeId` evita que se solape consigo misma. Es un aviso, nunca un bloqueo — el caller
 *  decide qué hacer con el resultado (mostrar warning, dejar agendar igual). */
export function encontrarSolapamientos(
  scheduledAt: Date,
  others: SolapamientoCandidate[],
  excludeId?: string,
): SolapamientoCandidate[] {
  const durationMs = INTERVIEW_DURATION_MINUTES * 60_000;
  const start = scheduledAt.getTime();
  const end = start + durationMs;
  return others.filter((o) => {
    if (o.id === excludeId || o.status === "cancelled") return false;
    const oStart = o.scheduledAt.getTime();
    const oEnd = oStart + durationMs;
    return start < oEnd && oStart < end;
  });
}
