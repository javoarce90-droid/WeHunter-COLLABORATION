"use client";

import { useOptimistic, useState, useTransition } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { useToast } from "@/lib/toast";
import { KIND_DOT } from "../../applications/ui/stage-visual";
import {
  agregarEtapaAction,
  renombrarEtapaAction,
  eliminarEtapaAction,
  reordenarEtapasAction,
  configurarSlaEtapaBusquedaAction,
} from "../actions";
import type { JobStage } from "../schema";

type Props = {
  jobId: string;
  stages: JobStage[];
  open: boolean;
  onClose: () => void;
};

/** Mismo criterio que ya aplica el dominio (KINDS_IRREMPLAZABLES en gestionar-etapas-busqueda.ts). */
const SIN_SLA_KINDS = new Set(["hired", "rejected"]);
const SIN_BORRADO_KINDS = new Set(["inbox", "hired", "rejected"]);

type Update =
  | { type: "patch"; stageId: string; patch: Partial<JobStage> }
  | { type: "reorder"; stages: JobStage[] }
  | { type: "remove"; stageId: string };

export function JobStageSettingsPanel({ jobId, stages, open, onClose }: Props) {
  const toast = useToast();
  const [, startTransition] = useTransition();
  const [newName, setNewName] = useState("");
  const [newSla, setNewSla] = useState("");

  const [optimisticStages, applyUpdate] = useOptimistic(
    stages,
    (state, update: Update) => {
      if (update.type === "reorder") return update.stages;
      if (update.type === "remove") return state.filter((s) => s.id !== update.stageId);
      return state.map((s) => (s.id === update.stageId ? { ...s, ...update.patch } : s));
    },
  );

  // La bandeja ("Postulados") no es columna del tablero — no se muestra ni se reordena acá.
  const visibles = [...optimisticStages]
    .filter((s) => s.kind !== "inbox")
    .sort((a, b) => a.position - b.position);

  function withErrorToast(res: { ok: boolean; error?: string }) {
    if (!res.ok) toast({ message: res.error ?? "No se pudo actualizar.", variant: "danger" });
  }

  function renombrar(stageId: string, name: string) {
    startTransition(async () => {
      applyUpdate({ type: "patch", stageId, patch: { name } });
      withErrorToast(await renombrarEtapaAction(jobId, stageId, name));
    });
  }

  function setSla(stageId: string, slaDays: number | null) {
    startTransition(async () => {
      applyUpdate({ type: "patch", stageId, patch: { slaDays } });
      withErrorToast(await configurarSlaEtapaBusquedaAction(jobId, stageId, slaDays));
    });
  }

  function eliminar(stageId: string) {
    startTransition(async () => {
      applyUpdate({ type: "remove", stageId });
      withErrorToast(await eliminarEtapaAction(jobId, stageId));
    });
  }

  function mover(stageId: string, direction: -1 | 1) {
    const idx = visibles.findIndex((s) => s.id === stageId);
    const target = idx + direction;
    if (idx < 0 || target < 0 || target >= visibles.length) return;

    const reordered = [...visibles];
    [reordered[idx], reordered[target]] = [reordered[target], reordered[idx]];
    // La bandeja siempre entra primero: reordenarEtapasAction exige el set completo.
    const inbox = optimisticStages.find((s) => s.kind === "inbox");
    const fullOrder = inbox ? [inbox, ...reordered] : reordered;

    startTransition(async () => {
      applyUpdate({
        type: "reorder",
        stages: fullOrder.map((s, i) => ({ ...s, position: i })),
      });
      withErrorToast(await reordenarEtapasAction(jobId, fullOrder.map((s) => s.id)));
    });
  }

  function agregar() {
    const name = newName.trim();
    if (name.length < 2) return;
    const slaDays = newSla.trim() === "" ? null : parseInt(newSla, 10);
    if (slaDays !== null && (isNaN(slaDays) || slaDays < 1)) return;
    startTransition(async () => {
      const res = await agregarEtapaAction(jobId, name, slaDays);
      withErrorToast(res);
      if (res.ok) {
        setNewName("");
        setNewSla("");
      }
    });
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      side="right"
      className="max-w-[380px]"
      header={
        <p className="font-display text-base font-bold text-text">Etapas de esta búsqueda</p>
      }
    >
      <div className="flex flex-col gap-1.5">
        <p className="mb-3 text-xs text-muted">
          Estas etapas y su SLA son propias de esta búsqueda: cambiarlas no afecta a las demás.
        </p>

        {visibles.map((stage, i) => {
          const sinSla = SIN_SLA_KINDS.has(stage.kind);
          const sinBorrado = SIN_BORRADO_KINDS.has(stage.kind);
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
              <StageNameInput value={stage.name} onCommit={(name) => renombrar(stage.id, name)} />

              {!sinSla && <SlaInput value={stage.slaDays} onChange={(v) => setSla(stage.id, v)} />}

              <div className="flex shrink-0 items-center gap-0.5">
                <IconButton
                  aria-label={`Subir ${stage.name}`}
                  size="sm"
                  disabled={i === 0}
                  onClick={() => mover(stage.id, -1)}
                >
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="m2.5 7.5 3.5-3 3.5 3" />
                  </svg>
                </IconButton>
                <IconButton
                  aria-label={`Bajar ${stage.name}`}
                  size="sm"
                  disabled={i === visibles.length - 1}
                  onClick={() => mover(stage.id, 1)}
                >
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="m2.5 4.5 3.5 3 3.5-3" />
                  </svg>
                </IconButton>
                {!sinBorrado && (
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
                )}
              </div>
            </div>
          );
        })}

        <div className="mt-3 flex items-center gap-2">
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
            Agregar
          </Button>
        </div>

        <div className="mt-4 border-t border-border pt-3">
          <Button type="button" variant="primary" className="w-full" onClick={onClose}>
            Listo
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function StageNameInput({
  value,
  onCommit,
}: {
  value: string;
  onCommit: (name: string) => void;
}) {
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

function SlaInput({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
}) {
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
