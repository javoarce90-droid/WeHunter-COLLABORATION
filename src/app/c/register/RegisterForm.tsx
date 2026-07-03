"use client";

import { useActionState } from "react";
import Link from "next/link";
import { candidateRegister, type CandidateAuthFormState } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

const initialState: CandidateAuthFormState = {};

export function RegisterForm({ redirectTo }: { redirectTo: string }) {
  const [state, formAction, pending] = useActionState(candidateRegister, initialState);
  const loginHref = redirectTo === "/" ? "/c/login" : `/c/login?redirect=${encodeURIComponent(redirectTo)}`;

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="redirect" value={redirectTo} />
          <Input label="Nombre completo" name="fullName" type="text" autoComplete="name" required />
          <Input label="Email" name="email" type="email" autoComplete="email" required />
          <Input
            label="Contraseña"
            name="password"
            type="password"
            autoComplete="new-password"
            required
          />
          {state.error && <p className="text-xs text-danger">{state.error}</p>}
          <Button type="submit" disabled={pending}>
            {pending ? "Creando cuenta…" : "Crear cuenta"}
          </Button>
        </form>
        <p className="text-center text-xs text-muted">
          ¿Ya tenés cuenta?{" "}
          <Link href={loginHref} className="font-semibold text-primary">
            Ingresá
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
