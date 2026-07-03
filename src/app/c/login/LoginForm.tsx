"use client";

import { useActionState } from "react";
import Link from "next/link";
import { candidateLogin, type CandidateAuthFormState } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

const initialState: CandidateAuthFormState = {};

export function LoginForm({ redirectTo }: { redirectTo: string }) {
  const [state, formAction, pending] = useActionState(candidateLogin, initialState);
  const registerHref =
    redirectTo === "/" ? "/c/register" : `/c/register?redirect=${encodeURIComponent(redirectTo)}`;

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="redirect" value={redirectTo} />
          <Input label="Email" name="email" type="email" autoComplete="email" required />
          <Input
            label="Contraseña"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
          {state.error && <p className="text-xs text-danger">{state.error}</p>}
          <Button type="submit" disabled={pending}>
            {pending ? "Ingresando…" : "Ingresar"}
          </Button>
        </form>
        <p className="text-center text-xs text-muted">
          ¿No tenés cuenta?{" "}
          <Link href={registerHref} className="font-semibold text-primary">
            Registrate
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
