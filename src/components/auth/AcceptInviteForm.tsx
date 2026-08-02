"use client";

import { useActionState } from "react";
import { aceptarInvitacionAction, type AcceptInviteState } from "@/features/recruiter/team/actions";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Card, CardContent } from "@/components/ui/card";

const initialState: AcceptInviteState = {};

export function AcceptInviteForm({
  token,
  /** true = ya existe una cuenta con este email: no se pide contraseña, solo confirmar. */
  needsPassword,
}: {
  token: string;
  needsPassword: boolean;
}) {
  const [state, formAction] = useActionState(aceptarInvitacionAction, initialState);

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm text-text">
          {needsPassword
            ? "Creá una contraseña para activar tu cuenta."
            : "Ya tenés una cuenta con este email — confirmá para sumarte al workspace."}
        </p>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="token" value={token} />
          {needsPassword && (
            <>
              <Input
                label="Contraseña"
                name="password"
                type="password"
                autoComplete="new-password"
                required
              />
              <Input
                label="Repetir contraseña"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
              />
            </>
          )}
          {state.error && <p className="text-xs text-danger">{state.error}</p>}
          <SubmitButton>
            {needsPassword ? "Crear contraseña e ingresar" : "Sumarme al workspace"}
          </SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}
