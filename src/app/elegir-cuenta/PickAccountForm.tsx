"use client";

import { useActionState, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/submit-button";
import { elegirTipoDeCuenta, type PickAccountState } from "./actions";

const initialState: PickAccountState = {};

type AccountType = "candidate" | "recruiter";

const OPCIONES: { type: AccountType; label: string; detail: string }[] = [
  {
    type: "candidate",
    label: "Busco trabajo",
    detail: "Postularme a avisos y seguir mis procesos.",
  },
  {
    type: "recruiter",
    label: "Quiero contratar",
    detail: "Publicar búsquedas y gestionar candidatos.",
  },
];

/** Dos opciones excluyentes, sin default preseleccionado: elegir mal manda al reino
 *  equivocado y hoy el usuario no lo puede deshacer solo. */
export function PickAccountForm() {
  const [state, formAction] = useActionState(elegirTipoDeCuenta, initialState);
  const [selected, setSelected] = useState<AccountType | null>(null);

  return (
    <Card>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="accountType" value={selected ?? ""} />

          <div role="radiogroup" aria-label="Tipo de cuenta" className="flex flex-col gap-2">
            {OPCIONES.map((o) => {
              const active = selected === o.type;
              return (
                <button
                  key={o.type}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setSelected(o.type)}
                  className={[
                    "rounded-[var(--radius)] border px-4 py-3 text-left outline-none transition-colors",
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

          {state.error && <p className="text-xs text-danger">{state.error}</p>}

          <SubmitButton disabled={selected === null} className="w-full">
            Continuar
          </SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}
