"use client";

import { useOptimistic, useTransition, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/lib/toast";
import { STAGE_LABELS, isClosingStage } from "../../applications/schema";
import { STAGE_DOT } from "../../applications/ui/stage-visual";
import { configurarEtapaAction } from "../actions";
import type { PipelineStageConfig } from "../schema";
import type { ApplicationStage } from "../../applications/schema";

type Props = {
  config: PipelineStageConfig[];
  open: boolean;
  onClose: () => void;
};

export function StageSettingsPanel({ config, open, onClose }: Props) {
  const toast = useToast();
  const [, startTransition] = useTransition();
  const [optimisticConfig, applyUpdate] = useOptimistic(
    config,
    (state, update: { stageKey: ApplicationStage; patch: Partial<PipelineStageConfig> }) =>
      state.map((s) =>
        s.stageKey === update.stageKey ? { ...s, ...update.patch } : s,
      ),
  );

  function toggleActive(stageKey: ApplicationStage, isActive: boolean) {
    startTransition(async () => {
      applyUpdate({ stageKey, patch: { isActive } });
      const fd = new FormData();
      fd.set("stageKey", stageKey);
      fd.set("isActive", String(isActive));
      const res = await configurarEtapaAction({}, fd);
      if (!res.ok) toast({ message: res.error, variant: "danger" });
    });
  }

  function setSla(stageKey: ApplicationStage, slaDays: number | null) {
    startTransition(async () => {
      applyUpdate({ stageKey, patch: { slaDays } });
      const fd = new FormData();
      fd.set("stageKey", stageKey);
      fd.set("slaDays", slaDays !== null ? String(slaDays) : "");
      const res = await configurarEtapaAction({}, fd);
      if (!res.ok) toast({ message: res.error, variant: "danger" });
    });
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      side="right"
      className="max-w-[380px]"
      header={
        <p className="font-display text-base font-bold text-text">
          Configurar pipeline
        </p>
      }
    >
      <div className="flex flex-col gap-1">
        <p className="mb-3 text-xs text-muted">
          Activá o desactivá columnas y definí el SLA (días máximos en cada etapa).
        </p>

        {optimisticConfig.map((stage) => {
          const isTerminal = isClosingStage(stage.stageKey);
          return (
            <div
              key={stage.stageKey}
              className={[
                "flex items-center gap-3 rounded-lg border border-border px-3 py-2.5 transition-opacity",
                !stage.isActive && "opacity-50",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ background: STAGE_DOT[stage.stageKey] }}
                aria-hidden
              />
              <span className="flex-1 text-sm font-medium text-text">
                {STAGE_LABELS[stage.stageKey]}
              </span>

              {/* SLA input */}
              <SlaInput
                value={stage.slaDays}
                onChange={(v) => setSla(stage.stageKey, v)}
              />

              {/* Toggle is_active */}
              <button
                type="button"
                role="switch"
                aria-checked={stage.isActive}
                disabled={isTerminal}
                onClick={() => !isTerminal && toggleActive(stage.stageKey, !stage.isActive)}
                title={
                  isTerminal
                    ? "Esta etapa no se puede desactivar"
                    : stage.isActive
                    ? "Desactivar"
                    : "Activar"
                }
                className={[
                  "relative h-5 w-9 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]",
                  stage.isActive ? "bg-primary" : "bg-border",
                  isTerminal && "cursor-not-allowed opacity-40",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <span
                  className={[
                    "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
                    stage.isActive ? "left-4" : "left-0.5",
                  ].join(" ")}
                />
              </button>
            </div>
          );
        })}
      </div>
    </Dialog>
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
    <div className="flex items-center gap-1">
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
      <span className="text-[10px] text-muted">d</span>
    </div>
  );
}
