"use client";

import { useActionState } from "react";
import {
  updatePassword,
  type AuthRealm,
  type ResetPasswordState,
} from "@/app/auth/actions";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Card, CardContent } from "@/components/ui/card";

const initialState: ResetPasswordState = {};

export function ResetPasswordForm({ realm }: { realm: AuthRealm }) {
  const [state, formAction] = useActionState(updatePassword, initialState);

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm text-text">Elegí tu nueva contraseña.</p>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="realm" value={realm} />
          <Input
            label="Nueva contraseña"
            name="password"
            type="password"
            autoComplete="new-password"
            required
          />
          <Input
            label="Repetir contraseña"
            name="confirm"
            type="password"
            autoComplete="new-password"
            required
          />
          {state.error && <p className="text-xs text-danger">{state.error}</p>}
          <SubmitButton>Guardar contraseña</SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}
