"use client";

import { useActionState, useRef } from "react";
import { asignarRecruiterAClienteAction } from "../actions";
import type { AsignarRecruiterState } from "../actions";
import type { AssignableRecruiter } from "../data/clients.queries";

type Props = {
  clientId: string;
  recruiters: AssignableRecruiter[];
  canEdit: boolean;
};

/**
 * "Recruiter asignado" del cliente: alcance simple, un recruiter a la vez. Visible para
 * todos los roles; editable (select, auto-submit al cambiar) solo para quien puede
 * gestionar clientes — el resto ve el nombre en texto plano.
 */
export function AssignedRecruiterControl({ clientId, recruiters, canEdit }: Props) {
  const assigned = recruiters.find((r) => r.assigned) ?? null;
  const [state, dispatch] = useActionState<AsignarRecruiterState, FormData>(
    asignarRecruiterAClienteAction,
    {},
  );
  const formRef = useRef<HTMLFormElement>(null);

  // Sin elección real que ofrecer (0 o 1 recruiter posible): texto plano, aunque el usuario
  // pueda editar clientes en general.
  if (!canEdit || recruiters.length <= 1) {
    return (
      <p className="text-sm text-text">
        <span className="font-semibold text-muted">Recruiter asignado:</span>{" "}
        {assigned?.name ?? "Sin asignar"}
      </p>
    );
  }

  return (
    <form ref={formRef} action={dispatch} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="clientId" value={clientId} />
      <label htmlFor="assigned-recruiter" className="text-xs font-semibold text-muted">
        Recruiter asignado
      </label>
      <select
        id="assigned-recruiter"
        name="membershipId"
        defaultValue={assigned?.membershipId ?? ""}
        onChange={() => formRef.current?.requestSubmit()}
        className="rounded-[var(--radius)] border border-border bg-bg px-2.5 py-1.5 text-sm text-text outline-none focus:border-primary focus:ring-2 focus:ring-[var(--focus-ring)]"
      >
        <option value="">Sin asignar</option>
        {recruiters.map((r) => (
          <option key={r.membershipId} value={r.membershipId}>
            {r.name ?? "Sin nombre"}
          </option>
        ))}
      </select>
      {state.error && <span className="text-xs text-danger">{state.error}</span>}
    </form>
  );
}
