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

type Draft = { name: string; sla: string };

function draftFor(stage: JobStage): Draft {
  return { name: stage.name, sla: stage.slaDays != null ? String(stage.slaDays) : "" };
}

/**
 * Editor de la plantilla de etapas por defecto: con estas nace cada búsqueda nueva. Cambiarla
 * acá no afecta a las búsquedas ya creadas — cada una es dueña de las suyas desde que nace
 * (gestionar-etapas-busqueda.ts). Calco de JobStageSettingsPanel.tsx, pero a nivel org e
 * inline en su tab de Configuración (no un panel lateral).
 *
 * Nombre y SLA quedan en borrador local hasta apretar "Guardar cambios" (QA 2.1: el autosave
 * silencioso no avisaba al usuario que algo se había persistido). Agregar/eliminar/reordenar
 * siguen siendo inmediatos — son operaciones estructurales con su propio feedback (aparecen o
 * desaparecen al toque), no valores que se estén todavía redactando.
 */
export function StageTemplateEditor({ stages }: Props) {
  const toast = useToast();
  const [isPending, startTransition] = useTransition();
  const [newName, setNewName] = useState("");
  const [newSla, setNewSla] = useState("");
  const [drafts, setDrafts] = useState<Record<string, Draft>>(() =>
    Object.fromEntries(stages.map((s) => [s.id, draftFor(s)])),
  );

  const [optimisticStages, applyUpdate] = useOptimistic(stages, (state, update: Update) => {
    if (update.type === "replace") return update.stages;
    if (update.type === "reorder") return update.stages;
    if (update.type === "remove") return state.filter((s) => s.id !== update.stageId);
    return state.map((s) => (s.id === update.stageId ? { ...s, ...update.patch } : s));
  });

  const ordered = [...optimisticStages].sort((a, b) => a.position - b.position);
  const enProceso = ordered.filter((s) => s.kind === "in_process");

  // Mantiene el borrador en sync cuando agregar/eliminar cambia el set de etapas — sin pisar
  // ediciones de nombre/SLA todavía no guardadas de las etapas que siguen ahí. Ajuste de
  // estado durante el render (no en un efecto): `stages` solo cambia de identidad cuando el
  // server revalida, así que esto no dispara en cada tecleo.
  const [syncedStages, setSyncedStages] = useState(stages);
  if (stages !== syncedStages) {
    setSyncedStages(stages);
    setDrafts((prev) => {
      const next: Record<string, Draft> = {};
      for (const s of stages) next[s.id] = prev[s.id] ?? draftFor(s);
      return next;
    });
  }

  const dirtyStages = ordered.filter((s) => {
    const d = drafts[s.id];
    if (!d) return false;
    return d.name !== s.name || d.sla !== (s.slaDays != null ? String(s.slaDays) : "");
  });
  const isDirty = dirtyStages.length > 0;

  function withErrorToast(res: { ok: boolean; error?: string }) {
    if (!res.ok) toast({ message: res.error ?? "No se pudo actualizar.", variant: "danger" });
  }

  function editarNombre(stageId: string, name: string) {
    setDrafts((prev) => ({ ...prev, [stageId]: { ...prev[stageId], name } }));
  }

  function editarSla(stageId: string, sla: string) {
    setDrafts((prev) => ({ ...prev, [stageId]: { ...prev[stageId], sla } }));
  }

  function descartarCambios() {
    setDrafts(Object.fromEntries(stages.map((s) => [s.id, draftFor(s)])));
  }

  function guardarCambios() {
    for (const s of dirtyStages) {
      const d = drafts[s.id];
      if (!FIJA_KINDS.has(s.kind) && d.name.trim().length < 2) {
        toast({ message: `El nombre de "${s.name}" es muy corto.`, variant: "danger" });
        return;
      }
      if (d.sla.trim() !== "" && (isNaN(parseInt(d.sla, 10)) || parseInt(d.sla, 10) < 1)) {
        toast({ message: `El SLA de "${d.name || s.name}" no es válido.`, variant: "danger" });
        return;
      }
    }

    startTransition(async () => {
      const results = await Promise.all(
        dirtyStages.flatMap((s) => {
          const d = drafts[s.id];
          const tasks: Promise<{ ok: boolean; error?: string }>[] = [];
          const name = d.name.trim();
          if (!FIJA_KINDS.has(s.kind) && name !== s.name) {
            applyUpdate({ type: "patch", stageId: s.id, patch: { name } });
            tasks.push(renombrarEtapaPlantillaAction(s.id, name));
          }
          const originalSla = s.slaDays != null ? String(s.slaDays) : "";
          if (!SIN_SLA_KINDS.has(s.kind) && d.sla !== originalSla) {
            const slaDays = d.sla.trim() === "" ? null : parseInt(d.sla, 10);
            applyUpdate({ type: "patch", stageId: s.id, patch: { slaDays } });
            tasks.push(configurarSlaPlantillaAction(s.id, slaDays));
          }
          return tasks;
        }),
      );

      const failed = results.filter((r) => !r.ok);
      if (failed.length > 0) {
        toast({ message: failed[0].error ?? "No se pudieron guardar algunos cambios.", variant: "danger" });
      } else {
        toast({ message: "Cambios guardados.", variant: "success" });
      }
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
      <div className="flex flex-col gap-2">
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
          const draft = drafts[stage.id] ?? draftFor(stage);
          const dirty = dirtyStages.some((s) => s.id === stage.id);

          return (
            <div
              key={stage.id}
              className={[
                "flex items-center gap-2 rounded-lg border px-3 py-3 transition-colors",
                dirty ? "border-primary/40 bg-primary-light/40" : "border-border",
              ].join(" ")}
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ background: KIND_DOT[stage.kind] }}
                aria-hidden
              />

              {fija ? (
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-text">{stage.name}</span>
              ) : (
                <input
                  type="text"
                  value={draft.name}
                  onChange={(e) => editarNombre(stage.id, e.target.value)}
                  aria-label="Nombre de la etapa"
                  className="min-w-0 flex-1 rounded border border-transparent bg-transparent px-2 py-1 text-sm font-medium text-text hover:border-border focus:border-primary focus:bg-surface focus:outline-none"
                />
              )}

              {!sinSla && (
                <div className="flex shrink-0 items-center gap-1">
                  <input
                    type="number"
                    min={1}
                    value={draft.sla}
                    onChange={(e) => editarSla(stage.id, e.target.value)}
                    placeholder="—"
                    aria-label="SLA en días"
                    className="w-10 rounded border border-border bg-bg px-2 py-1 text-center text-xs text-text focus:border-primary focus:outline-none"
                  />
                  <span className="text-[10px] text-muted">días</span>
                </div>
              )}

              <div className="flex shrink-0 items-center gap-1">
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
                  <span className="rounded-[5px] border border-border bg-bg px-2 py-1 text-[10px] font-bold uppercase text-muted">
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
            className="min-w-0 flex-1 rounded-[var(--radius)] border border-border bg-bg px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
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
              className="w-10 rounded border border-border bg-bg px-2 py-2 text-center text-xs text-text focus:border-primary focus:outline-none"
            />
            <span className="text-[10px] text-muted">días</span>
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={agregar}>
            Agregar etapa
          </Button>
        </div>
      </div>

      {isDirty && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary-light/60 px-4 py-3">
          <p className="text-xs font-medium text-text">
            Tenés cambios de nombre o SLA sin guardar.
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={descartarCambios} disabled={isPending}>
              Descartar
            </Button>
            <Button type="button" variant="primary" size="sm" onClick={guardarCambios} loading={isPending}>
              Guardar cambios
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
