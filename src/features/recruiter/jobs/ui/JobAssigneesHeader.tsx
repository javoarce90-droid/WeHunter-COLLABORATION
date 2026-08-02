"use client";

import { useState, useTransition } from "react";
import { Avatar } from "@/components/ui/avatar";
import { useToast } from "@/lib/toast";
import { reasignarResponsableAction, actualizarSourcerAction } from "../actions";

export type AssigneeOption = { membershipId: string; name: string | null; email: string };

const fieldClass =
  "h-8 rounded-[var(--radius)] border border-border bg-bg px-2 text-xs text-text outline-none focus:border-primary disabled:opacity-60";

/** Fila "Responsable / Sourcer (opcional)" del header de una búsqueda — mismo lugar y misma
 *  idea que el prototipo, cableado a los casos de uso reales (`gestionar-responsables.ts`). */
export function JobAssigneesHeader({
  jobId,
  responsible,
  sourcer,
  eligibleResponsibles,
  eligibleSourcers,
  canManage,
}: {
  jobId: string;
  responsible: AssigneeOption;
  sourcer: AssigneeOption | null;
  eligibleResponsibles: AssigneeOption[];
  eligibleSourcers: AssigneeOption[];
  canManage: boolean;
}) {
  const toast = useToast();
  const [, startTransition] = useTransition();
  const [addingSourcer, setAddingSourcer] = useState(false);

  function onChangeResponsible(membershipId: string) {
    startTransition(async () => {
      const res = await reasignarResponsableAction(jobId, membershipId);
      if (res.error) toast({ message: res.error, variant: "danger" });
    });
  }

  function onAddSourcer(membershipId: string) {
    if (!membershipId) return;
    setAddingSourcer(false);
    startTransition(async () => {
      const res = await actualizarSourcerAction(jobId, membershipId);
      if (res.error) toast({ message: res.error, variant: "danger" });
    });
  }

  function onRemoveSourcer() {
    startTransition(async () => {
      const res = await actualizarSourcerAction(jobId, null);
      if (res.error) toast({ message: res.error, variant: "danger" });
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-y border-border py-2.5">
      <div className="flex items-center gap-2">
        <span className="text-[10.5px] font-bold uppercase tracking-wide text-muted">
          Responsable
        </span>
        {canManage ? (
          <select
            defaultValue={responsible.membershipId}
            onChange={(e) => onChangeResponsible(e.target.value)}
            className={fieldClass}
          >
            {eligibleResponsibles.map((p) => (
              <option key={p.membershipId} value={p.membershipId}>
                {p.name ?? p.email}
              </option>
            ))}
          </select>
        ) : (
          <span className="text-sm font-medium text-text">
            {responsible.name ?? responsible.email}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10.5px] font-bold uppercase tracking-wide text-muted">
          Sourcer (opcional)
        </span>
        {sourcer ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-bg py-0.5 pl-1 pr-2 text-xs text-text">
            <Avatar name={sourcer.name ?? sourcer.email} size="sm" />
            {sourcer.name ?? sourcer.email}
            {canManage && (
              <button
                type="button"
                onClick={onRemoveSourcer}
                aria-label="Sacar Sourcer"
                className="text-muted hover:text-danger"
              >
                ✕
              </button>
            )}
          </span>
        ) : canManage ? (
          addingSourcer ? (
            <select
              autoFocus
              defaultValue=""
              onChange={(e) => onAddSourcer(e.target.value)}
              onBlur={() => setAddingSourcer(false)}
              className={fieldClass}
            >
              <option value="">Elegí un Sourcer…</option>
              {eligibleSourcers.map((p) => (
                <option key={p.membershipId} value={p.membershipId}>
                  {p.name ?? p.email}
                </option>
              ))}
            </select>
          ) : (
            <button
              type="button"
              onClick={() => setAddingSourcer(true)}
              disabled={eligibleSourcers.length === 0}
              className="text-xs font-semibold text-primary hover:underline disabled:cursor-not-allowed disabled:text-muted disabled:no-underline"
            >
              + Asignar…
            </button>
          )
        ) : (
          <span className="text-xs text-muted">Sin asignar</span>
        )}
      </div>
    </div>
  );
}
