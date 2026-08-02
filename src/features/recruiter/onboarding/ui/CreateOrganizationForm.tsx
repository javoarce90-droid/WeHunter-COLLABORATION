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

const initialState: OnboardingFormState = {};

/** El tipo de workspace decide qué se le ofrece después (clientes externos, hiring managers),
 *  por eso se pregunta en el alta y no en configuración. */
const USOS: { type: WorkspaceType; label: string; detail: string }[] = [
  {
    type: "freelance",
    label: "Trabajo de forma independiente",
    detail: "Recruiter freelance, con tus propios clientes.",
  },
  {
    type: "team",
    label: "Trabajo en un equipo de Recruiting",
    detail: "Consultora o área de Talent Acquisition.",
  },
  {
    type: "enterprise",
    label: "Represento a una empresa",
    detail: "Contratación interna, con hiring managers involucrados.",
  },
];

export function CreateOrganizationForm() {
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
            <div
              role="radiogroup"
              aria-label="Cómo vas a usar WeHunter"
              className="flex flex-col gap-2"
            >
              {USOS.map((o) => {
                const active = uso === o.type;
                return (
                  <button
                    key={o.type}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setUso(o.type)}
                    className={[
                      "rounded-[var(--radius)] border px-3.5 py-2.5 text-left outline-none transition-colors",
                      "focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]",
                      active
                        ? "border-primary bg-primary-light"
                        : "border-border bg-surface hover:border-primary/40",
                    ].join(" ")}
                  >
                    <span
                      className={`block text-sm font-semibold ${active ? "text-primary-hover" : "text-text"}`}
                    >
                      {o.label}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted">{o.detail}</span>
                  </button>
                );
              })}
            </div>
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
