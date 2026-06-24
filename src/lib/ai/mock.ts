import type {
  AiProvider,
  ScoreApplicationInput,
  ScoreApplicationResult,
  DraftOfferInput,
} from "./provider";

/**
 * Proveedor de IA mock: determinístico (mismo input → mismo output), sin modelo real ni red.
 * Suficiente para que la experiencia de IA sea real (scores persistidos, paneles ✦) y quede
 * lista para enchufar un modelo detrás de la interfaz AiProvider.
 */

/** Hash estable y chico de un string (FNV-1a). Determinístico, sin Math.random. */
function stableHash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return Math.abs(h);
}

const norm = (s: string) => s.trim().toLowerCase();

export class MockAiProvider implements AiProvider {
  async scoreApplication(input: ScoreApplicationInput): Promise<ScoreApplicationResult> {
    const { candidate, job } = input;
    const jobSkills = (job.skills ?? []).map(norm).filter(Boolean);
    const candSkills = (candidate.skills ?? []).map(norm).filter(Boolean);

    const redFlags: string[] = [];

    let score: number;
    let matched = 0;
    if (jobSkills.length > 0 && candSkills.length > 0) {
      matched = jobSkills.filter((s) => candSkills.includes(s)).length;
      // 35–95 según solapamiento de skills con la búsqueda.
      score = 35 + Math.round((matched / jobSkills.length) * 60);
      if (matched === 0) redFlags.push("Sin skills coincidentes con la búsqueda");
    } else {
      // Sin skills para comparar: score medio, marcado como dato insuficiente.
      score = 55;
      redFlags.push("Faltan skills para evaluar el match");
    }

    if (candidate.summary) score += 3;
    if (candidate.source === "referral") score += 5;
    if (!candidate.hasCv) redFlags.push("Sin CV cargado");

    // Jitter determinístico por candidato para desempatar perfiles equivalentes.
    score += stableHash(candidate.id) % 5;
    score = Math.max(5, Math.min(99, score));

    const summary =
      jobSkills.length > 0 && candSkills.length > 0
        ? `Coincide en ${matched} de ${jobSkills.length} skills clave de ${job.title}.`
        : `Match estimado para ${job.title} con datos limitados del perfil.`;

    return { score, summary, redFlags };
  }

  async draftOffer(input: DraftOfferInput): Promise<string> {
    const { candidateName, jobTitle, salary } = input;
    const firstName = candidateName.split(" ")[0] || candidateName;
    const salaryLine = salary
      ? `La propuesta económica es de ${salary}, acorde a tu experiencia y al mercado.`
      : "La propuesta económica la conversamos en la próxima instancia.";

    return (
      `Hola ${firstName},\n\n` +
      `Tras conocerte durante el proceso, nos entusiasma ofrecerte la posición de ${jobTitle}. ` +
      `Tu perfil es un gran aporte para el equipo y estamos convencidos de que vas a crecer con nosotros.\n\n` +
      `${salaryLine}\n\n` +
      `Quedamos atentos a tus comentarios para coordinar los próximos pasos. ¡Esperamos sumarte!`
    );
  }
}
