/** Reglas de los horarios tentativos que propone quien pide una entrevista (Cliente por
 *  token o Hiring Manager por sesión) — compartidas por `solicitarEntrevista` (camino
 *  Cliente) y `solicitarEntrevistaInterno` (camino HM, en recruiter/shortlists/domain). */

export const MAX_INTERVIEW_SLOTS = 3;

export function parseInterviewSlots(
  raw: string[],
): { ok: true; data: Date[] } | { ok: false; error: string } {
  const cleaned = raw.map((s) => s.trim()).filter((s) => s !== "");

  if (cleaned.length === 0) {
    return { ok: false, error: "Proponé al menos un horario para la entrevista." };
  }
  if (cleaned.length > MAX_INTERVIEW_SLOTS) {
    return { ok: false, error: `Podés proponer como máximo ${MAX_INTERVIEW_SLOTS} horarios.` };
  }

  const dates: Date[] = [];
  const seen = new Set<number>();
  for (const value of cleaned) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return { ok: false, error: "Uno de los horarios propuestos no es una fecha válida." };
    }
    if (date.getTime() <= Date.now()) {
      return { ok: false, error: "Los horarios propuestos deben ser a futuro." };
    }
    if (seen.has(date.getTime())) {
      return { ok: false, error: "No repitas el mismo horario en más de una opción." };
    }
    seen.add(date.getTime());
    dates.push(date);
  }

  return { ok: true, data: dates };
}
