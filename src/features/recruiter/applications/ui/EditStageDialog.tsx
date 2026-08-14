"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { JobStage } from "@/features/recruiter/pipeline-stages/schema";

type Props = {
  stage: JobStage | null;
  /** Etapas de cierre (hired/rejected) no tienen SLA — mismo criterio que el tablero. */
  hideSla: boolean;
  onRename: (stageId: string, name: string) => void;
  onSlaChange: (stageId: string, slaDays: number | null) => void;
  onClose: () => void;
};

/**
 * Editar nombre + SLA de una etapa puntual del pipeline, vía botón "Editar etapa" por
 * columna (reemplaza los inputs inline permanentes que confundían al mezclar vista y
 * edición todo el tiempo — feedback QA ago 2026). Reordenar sigue siendo drag directo en
 * el tablero, y agregar/eliminar etapa siguen con sus propios controles — esto es solo
 * nombre + SLA de una etapa a la vez.
 */
export function EditStageDialog({ stage, hideSla, onRename, onSlaChange, onClose }: Props) {
  const [name, setName] = useState(stage?.name ?? "");
  const [sla, setSla] = useState(stage?.slaDays != null ? String(stage.slaDays) : "");

  // El diálogo se remonta por `key` en el padre (ver PipelineView), así que no hace falta
  // sincronizar `name`/`sla` con props en un efecto: cada apertura ya arranca con los
  // valores correctos de la etapa que se está editando.

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stage) return;
    const trimmed = name.trim();
    if (trimmed.length >= 2 && trimmed !== stage.name) {
      onRename(stage.id, trimmed);
    }
    if (!hideSla) {
      const parsed = sla.trim() === "" ? null : parseInt(sla, 10);
      const valid = parsed === null || (!isNaN(parsed) && parsed >= 1);
      if (valid && parsed !== stage.slaDays) {
        onSlaChange(stage.id, parsed);
      }
    }
    onClose();
  }

  return (
    <Dialog open={stage != null} onClose={onClose} side="center" title="Editar etapa" className="max-w-sm">
      {stage && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Nombre de la etapa"
            value={name}
            onChange={(e) => setName(e.target.value)}
            minLength={2}
            required
            autoFocus
          />
          {!hideSla && (
            <Input
              label="SLA (días)"
              type="number"
              min={1}
              value={sla}
              onChange={(e) => setSla(e.target.value)}
              placeholder="Sin definir"
            />
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">Guardar</Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
