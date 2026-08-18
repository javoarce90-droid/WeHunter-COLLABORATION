/** Bandas de completitud de perfil — deliberadamente separadas de `scoreBand`/`AiScore`
 *  (`src/components/ui/ai.tsx`): esas están etiquetadas semánticamente como "score IA"; acá
 *  no hay IA involucrada, es solo cuánto cargó el reclutador de la ficha del candidato. */
export type CompletenessBand = "alta" | "media" | "baja";

export function completenessBand(percent: number): CompletenessBand {
  if (percent >= 70) return "alta";
  if (percent >= 40) return "media";
  return "baja";
}

const BAND_CLASSES: Record<CompletenessBand, string> = {
  alta: "bg-[#DCFCE7] text-[#166534]",
  media: "bg-[#FEF3C7] text-[#92400E]",
  baja: "bg-danger/10 text-danger",
};

/** Badge compacto de % de completitud del perfil del candidato, con tooltip de lo que falta. */
export function CompletenessBadge({
  percent,
  faltantes,
}: {
  percent: number;
  faltantes?: string[];
}) {
  const band = completenessBand(percent);
  const title = faltantes?.length
    ? `Perfil ${percent}% completo. Falta: ${faltantes.join(", ")}.`
    : `Perfil ${percent}% completo.`;
  return (
    <span
      className={`inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ${BAND_CLASSES[band]}`}
      title={title}
    >
      {percent}%
    </span>
  );
}
