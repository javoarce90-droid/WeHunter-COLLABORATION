"use client";

import { useActionState } from "react";
import {
  crearOrganizationAction,
  type OnboardingFormState,
} from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

const initialState: OnboardingFormState = {};

export function CreateOrganizationForm() {
  const [state, formAction, pending] = useActionState(
    crearOrganizationAction,
    initialState,
  );

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
        <form action={formAction} className="flex flex-col gap-4">
          <Input
            label="Nombre del workspace"
            name="name"
            type="text"
            placeholder="Ej: Consultora Talento RH"
            required
            autoFocus
          />
          {state.error && <p className="text-xs text-danger">{state.error}</p>}
          <Button type="submit" disabled={pending}>
            {pending ? "Creando…" : "Crear workspace"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
