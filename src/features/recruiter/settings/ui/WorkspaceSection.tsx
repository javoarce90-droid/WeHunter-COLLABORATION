"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { editarWorkspaceAction } from "../actions";
import type { OrgSettings } from "../data/settings.queries";

export function WorkspaceSection({
  org,
  canEdit,
}: {
  org: OrgSettings;
  canEdit: boolean;
}) {
  const [state, dispatch, pending] = useActionState(editarWorkspaceAction, {});

  if (!canEdit) {
    return <p className="text-sm font-semibold text-text">{org.name}</p>;
  }

  return (
    <form action={dispatch} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5 max-w-md">
        <label className="text-xs font-semibold text-muted">Nombre del workspace</label>
        <input
          name="name"
          defaultValue={org.name}
          required
          className="w-full rounded-[var(--radius)] border border-border bg-bg px-3 py-2 text-sm text-text outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-[var(--focus-ring)]"
        />
        <span className="text-xs text-muted">
          El logo se edita desde{" "}
          <Link href="/career-site" className="font-semibold text-primary hover:text-primary-hover">
            Career Site
          </Link>
          .
        </span>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : "Guardar"}
        </Button>
        {state.ok && !pending && <span className="text-xs font-semibold text-success">Guardado ✓</span>}
        {state.error && <span className="text-xs text-danger">{state.error}</span>}
      </div>
    </form>
  );
}
