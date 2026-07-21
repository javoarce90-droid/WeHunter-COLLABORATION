import { Tooltip } from "@/components/ui/tooltip";
import type { CriteriosEvaluados } from "@/features/recruiter/screening/domain/evaluar-criterios";

/**
 * Indicador "N/M criterios de preselección cumplidos". Es lo primero que mira el recruiter
 * para separar quién cumple los mínimos del aviso antes de abrir un solo perfil, así que el
 * color hace el trabajo de un vistazo: todos cumplidos, algunos, ninguno.
 */
export function CriteriosChip({ criterios }: { criterios: CriteriosEvaluados }) {
  if (criterios.total === 0) {
    return <span className="text-xs text-muted">—</span>;
  }

  const { cumplidos, total } = criterios;
  const tone =
    cumplidos === total
      ? "bg-[#DCFCE7] text-[#166534]"
      : cumplidos === 0
        ? "bg-[#FEE2E2] text-[#991B1B]"
        : "bg-[#FEF3C7] text-[#92400E]";

  // El desglose pregunta por pregunta vive en el panel de detalle; acá alcanza el resumen
  // (el tooltip es de una línea a propósito).
  return (
    <Tooltip label={`${cumplidos} de ${total} criterios de preselección cumplidos`}>
      <span
        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${tone}`}
      >
        {cumplidos}/{total}
      </span>
    </Tooltip>
  );
}
