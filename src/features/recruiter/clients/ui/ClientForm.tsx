"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { ClientFormState } from "../actions";
import type { AssignableClientOwner } from "../data/clients.queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ROLE_LABELS } from "@/lib/auth/roles";

type ClientAction = (
  prev: ClientFormState,
  formData: FormData,
) => Promise<ClientFormState>;

interface ClientFormProps {
  action: ClientAction;
  submitLabel: string;
  clientId?: string;
  cancelHref?: string;
  defaults?: {
    name?: string;
    contactName?: string | null;
    contactEmail?: string | null;
    notes?: string | null;
  };
  /** Solo en el alta (sin `clientId`): candidatos a responsable cuando hay más de uno posible
   *  (owner/admin/recruiter). Con 0 o 1, no hay elección real — no se pasa este prop y el
   *  fallback de auto-asignación por org-de-un-solo-miembro sigue actuando en el dominio. */
  assignableMembers?: AssignableClientOwner[];
}

const initialState: ClientFormState = {};

export function ClientForm({
  action,
  submitLabel,
  clientId,
  cancelHref = "/clients",
  defaults,
  assignableMembers,
}: ClientFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const showAssignPicker = !clientId && assignableMembers && assignableMembers.length > 1;

  return (
    <Card>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          {clientId && <input type="hidden" name="clientId" value={clientId} />}

          <Input
            label="Nombre de la empresa"
            name="name"
            type="text"
            placeholder="Ej: Acme Corp"
            defaultValue={defaults?.name ?? ""}
            required
            autoFocus
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Contacto (opcional)"
              name="contactName"
              type="text"
              placeholder="Nombre del contacto"
              defaultValue={defaults?.contactName ?? ""}
            />
            <Input
              label="Email de contacto (opcional)"
              name="contactEmail"
              type="email"
              placeholder="contacto@empresa.com"
              defaultValue={defaults?.contactEmail ?? ""}
            />
          </div>

          {showAssignPicker && (
            <div className="flex flex-col gap-1">
              <label htmlFor="assignedMembershipId" className="text-xs font-semibold text-muted">
                Responsable (opcional)
              </label>
              <select
                id="assignedMembershipId"
                name="assignedMembershipId"
                defaultValue=""
                className="rounded-[var(--radius)] border border-border bg-bg px-2.5 py-1.5 text-sm text-text outline-none focus:border-primary focus:ring-2 focus:ring-[var(--focus-ring)]"
              >
                <option value="">Sin asignar</option>
                {assignableMembers!.map((m) => (
                  <option key={m.membershipId} value={m.membershipId}>
                    {m.name ?? "Sin nombre"} · {ROLE_LABELS[m.role]}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label htmlFor="notes" className="text-xs font-semibold text-muted">
              Notas (opcional)
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={4}
              placeholder="Contexto del cliente, acuerdos, condiciones…"
              defaultValue={defaults?.notes ?? ""}
              className="w-full rounded-[var(--radius)] border border-border bg-bg px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-[var(--focus-ring)]"
            />
          </div>

          {state.error && <p className="text-xs text-danger">{state.error}</p>}

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={pending}>
              {pending ? "Guardando…" : submitLabel}
            </Button>
            <Link href={cancelHref} className="text-sm font-semibold text-muted">
              Cancelar
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
