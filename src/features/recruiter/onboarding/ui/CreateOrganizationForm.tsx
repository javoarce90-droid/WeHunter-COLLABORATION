"use client";

import { useActionState, useState } from "react";
import {
  crearOrganizationAction,
  type OnboardingFormState,
} from "../actions";
import type { WorkspaceType } from "../schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { WorkspaceTypePicker } from "./WorkspaceTypePicker";

const initialState: OnboardingFormState = {};

export function CreateOrganizationForm({
  prices = {},
}: {
  prices?: Partial<Record<WorkspaceType, string>>;
}) {
  const [state, formAction, pending] = useActionState(
    crearOrganizationAction,
    initialState,
  );
  const [uso, setUso] = useState<WorkspaceType | null>(null);

  return (
    <Card>
      <CardHeader>
        <h1 className="font-display text-lg font-bold text-text">
          Creá tu workspace
        </h1>
        <p className="mt-1 text-sm text-muted">
          Es el espacio de tu consultora o equipo. Vas a ser el owner.
        </p>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-5">
          <Input
            label="Nombre del workspace"
            name="name"
            type="text"
            placeholder="Ej: Consultora Talento RH"
            required
            autoFocus
          />

          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-label">
              ¿Cómo vas a usar WeHunter?
            </span>
            <input type="hidden" name="workspaceType" value={uso ?? ""} />
            <WorkspaceTypePicker
              value={uso}
              onChange={setUso}
              ariaLabel="Cómo vas a usar WeHunter"
              prices={prices}
            />
          </div>

          {state.error && <p className="text-xs text-danger">{state.error}</p>}
          <Button type="submit" disabled={pending || uso === null}>
            {pending ? "Creando…" : "Crear workspace"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
