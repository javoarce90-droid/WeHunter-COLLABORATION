"use client";

import { useOptimistic, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { useToast } from "@/lib/toast";
import { KIND_DOT } from "@/features/recruiter/applications/ui/stage-visual";
import {
  agregarEtapaPlantillaAction,
  renombrarEtapaPlantillaAction,
  eliminarEtapaPlantillaAction,
  reordenarPlantillaAction,
  configurarSlaPlantillaAction,
  generarPlantillaPorDefectoAction,
} from "../actions";
import type { JobStage } from "../schema";

type Props = { stages: JobStage[] };

/** Mismo criterio que ya aplica el dominio (KINDS_IRREMPLAZABLES en gestionar-plantilla-etapas.ts). */
const SIN_SLA_KINDS = new Set(["inbox", "hired", "rejected"]);
const FIJA_KINDS = new Set(["inbox", "hired", "rejected"]);

type Update =
  | { type: "patch"; stageId: string; patch: Partial<JobStage> }
  | { type: "reorder"; stages: JobStage[] }
  | { type: "remove"; stageId: string }
  | { type: "replace"; stages: JobStage[] };

/**
 * Editor de la plantilla de etapas por defecto: con estas nace cada búsqueda nueva. Cambiarla
 * acá no afecta a las búsquedas ya creadas — cada una es dueña de las suyas desde que nace
 * (gestionar-etapas-busqueda.ts). Calco de JobStageSettingsPanel.tsx, pero a nivel org e
 * inline en su tab de Configuración (no un panel lateral).
 */
export function StageTemplateEditor({ stages }: Props) {
  const toast = useToast();
  const [, startTransition] = useTransition();
  const [newName, setNewName] = useState("");
  const [newSla, setNewSla] = useState("");

  const [optimisticStages, applyUpdate] = useOptimistic(stages, (state, update: Update) => {
    if (update.type === "replace") return update.stages;
    if (update.type === "reorder") return update.stages;
    if (update.type === "remove") return state.filter((s) => s.id !== update.stageId);
    return state.map((s) => (s.id === update.stageId ? { ...s, ...update.patch } : s));
  });

  const ordered = [...optimisticStages].sort((a, b) => a.position - b.position);
  const enProceso = ordered.filter((s) => s.kind === "in_process");

  function withErrorToast(res: { ok: boolean; error?: string }) {
    if (!res.ok) toast({ message: res.error ?? "No se pudo actualizar.", variant: "danger" });
  }

  function renombrar(stageId: string, name: string) {
    startTransition(async () => {
      applyUpdate({ type: "patch", stageId, patch: { name } });
      withErrorToast(await renombrarEtapaPlantillaAction(stageId, name));
    });
  }

  function setSla(stageId: string, slaDays: number | null) {
    startTransition(async () => {
      applyUpdate({ type: "patch", stageId, patch: { slaDays } });
      withErrorToast(await configurarSlaPlantillaAction(stageId, slaDays));
    });
  }

  function eliminar(stageId: string) {
    startTransition(async () => {
      applyUpdate({ type: "remove", stageId });
      withErrorToast(await eliminarEtapaPlantillaAction(stageId));
    });
  }

  function mover(stageId: string, direction: -1 | 1) {
    const idx = enProceso.findIndex((s) => s.id === stageId);
    const target = idx + direction;
    if (idx < 0 || target < 0 || target >= enProceso.length) return;

    const reorderedMiddle = [...enProceso];
    [reorderedMiddle[idx], reorderedMiddle[target]] = [reorderedMiddle[target], reorderedMiddle[idx]];
    const inbox = ordered.filter((s) => s.kind === "inbox");
    const cierre = ordered.filter((s) => s.kind !== "inbox" && s.kind !== "in_process");
    const fullOrder = [...inbox, ...reorderedMiddle, ...cierre];

    startTransition(async () => {
      applyUpdate({ type: "reorder", stages: fullOrder.map((s, i) => ({ ...s, position: i })) });
      withErrorToast(await reordenarPlantillaAction(fullOrder.map((s) => s.id)));
    });
  }

  function agregar() {
    const name = newName.trim();
    if (name.length < 2) return;
    const slaDays = newSla.trim() === "" ? null : parseInt(newSla, 10);
    if (slaDays !== null && (isNaN(slaDays) || slaDays < 1)) return;
    startTransition(async () => {
      const res = await agregarEtapaPlantillaAction(name, slaDays);
      withErrorToast(res);
      if (res.ok) {
        setNewName("");
        setNewSla("");
      }
    });
  }

  function generarPorDefecto() {
    startTransition(async () => {
      withErrorToast(await generarPlantillaPorDefectoAction());
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        {ordered.length === 0 && (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border px-3 py-6 text-center">
            <p className="text-xs text-muted">Esta organización todavía no tiene una plantilla de etapas.</p>
            <Button type="button" variant="secondary" size="sm" onClick={generarPorDefecto}>
              Generar plantilla por defecto
            </Button>
          </div>
        )}
        {ordered.map((stage) => {
          const sinSla = SIN_SLA_KINDS.has(stage.kind);
          const fija = FIJA_KINDS.has(stage.kind);
          const iInProceso = enProceso.findIndex((s) => s.id === stage.id);

          return (
            <div
              key={stage.id}
              className="flex items-center gap-2 rounded-lg border border-border px-3 py-2.5"
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ background: KIND_DOT[stage.kind] }}
                aria-hidden
              />

              {fija ? (
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-text">{stage.name}</span>
              ) : (
                <StageNameInput value={stage.name} onCommit={(name) => renombrar(stage.id, name)} />
              )}

              {!sinSla && <SlaInput value={stage.slaDays} onChange={(v) => setSla(stage.id, v)} />}

              <div className="flex shrink-0 items-center gap-0.5">
                {!fija && (
                  <>
                    <IconButton
                      aria-label={`Subir ${stage.name}`}
                      size="sm"
                      disabled={iInProceso <= 0}
                      onClick={() => mover(stage.id, -1)}
                    >
                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="m2.5 7.5 3.5-3 3.5 3" />
                      </svg>
                    </IconButton>
                    <IconButton
                      aria-label={`Bajar ${stage.name}`}
                      size="sm"
                      disabled={iInProceso === -1 || iInProceso === enProceso.length - 1}
                      onClick={() => mover(stage.id, 1)}
                    >
                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="m2.5 4.5 3.5 3 3.5-3" />
                      </svg>
                    </IconButton>
                    <IconButton
                      aria-label={`Eliminar ${stage.name}`}
                      size="sm"
                      onClick={() => eliminar(stage.id)}
                      className="text-danger hover:text-danger"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6" />
                      </svg>
                    </IconButton>
                  </>
                )}
                {fija && (
                  <span className="rounded-[5px] border border-border bg-bg px-1.5 py-0.5 text-[10px] font-bold uppercase text-muted">
                    Fija
                  </span>
                )}
              </div>
            </div>
          );
        })}

        <div className="mt-2 flex items-center gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && agregar()}
            placeholder="Nueva etapa"
            aria-label="Nombre de la nueva etapa"
            className="min-w-0 flex-1 rounded-[var(--radius)] border border-border bg-bg px-2.5 py-1.5 text-sm text-text focus:border-primary focus:outline-none"
          />
          <div className="flex shrink-0 items-center gap-1">
            <input
              type="number"
              min={1}
              value={newSla}
              onChange={(e) => setNewSla(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && agregar()}
              placeholder="—"
              aria-label="SLA en días de la nueva etapa"
              className="w-10 rounded border border-border bg-bg px-1.5 py-1.5 text-center text-xs text-text focus:border-primary focus:outline-none"
            />
            <span className="text-[10px] text-muted">días</span>
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={agregar}>
            Agregar etapa
          </Button>
        </div>
      </div>
    </div>
  );
}

function StageNameInput({ value, onCommit }: { value: string; onCommit: (name: string) => void }) {
  const [local, setLocal] = useState(value);

  function commit() {
    const name = local.trim();
    if (name.length < 2 || name === value) {
      setLocal(value);
      return;
    }
    onCommit(name);
  }

  return (
    <input
      type="text"
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
      aria-label="Nombre de la etapa"
      className="min-w-0 flex-1 rounded border border-transparent bg-transparent px-1.5 py-0.5 text-sm font-medium text-text hover:border-border focus:border-primary focus:bg-bg focus:outline-none"
    />
  );
}

function SlaInput({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  const [local, setLocal] = useState(value !== null ? String(value) : "");

  function commit() {
    const n = local.trim() === "" ? null : parseInt(local, 10);
    if (n !== null && (isNaN(n) || n < 1)) {
      setLocal(value !== null ? String(value) : "");
      return;
    }
    onChange(n);
  }

  return (
    <div className="flex shrink-0 items-center gap-1">
      <input
        type="number"
        min={1}
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && commit()}
        placeholder="—"
        className="w-10 rounded border border-border bg-bg px-1.5 py-0.5 text-center text-xs text-text focus:border-primary focus:outline-none"
        aria-label="SLA en días"
      />
      <span className="text-[10px] text-muted">días</span>
    </div>
  );
}
