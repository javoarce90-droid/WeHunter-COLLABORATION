"use client";

import { useActionState } from "react";
import Link from "next/link";
import { candidateLoginAction, type AuthFormState } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

const initialState: AuthFormState = {};

export function CandidateLoginForm({ redirectTo }: { redirectTo: string }) {
  const [state, formAction, pending] = useActionState(candidateLoginAction, initialState);

  return (
    <Card className="border border-border/80 shadow-[0_1px_3px_rgba(0,0,0,0.08),0_4px_12px_rgba(0,0,0,0.04)]">
      <CardContent className="flex flex-col gap-5 p-6">
        <div className="flex flex-col gap-1 text-center mb-2">
          <h2 className="text-xl font-bold text-text font-display">Ingresá a tu cuenta</h2>
          <p className="text-xs text-muted">Accedé al portal de candidatos de WeHunter</p>
        </div>

        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="redirect" value={redirectTo} />
          <Input
            label="Correo electrónico"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="nombre@ejemplo.com"
            required
          />
          <Input
            label="Contraseña"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            required
          />
          {state.error && (
            <p className="text-xs font-medium text-danger">{state.error}</p>
          )}
          <Button type="submit" disabled={pending} className="mt-2 w-full font-bold">
            {pending ? "Ingresando…" : "Iniciar Sesión"}
          </Button>
        </form>
        
        <p className="text-center text-xs text-muted">
          ¿No tenés cuenta de candidato?{" "}
          <Link href="/c/register" className="font-semibold text-primary hover:text-primary-hover hover:underline transition-colors">
            Registrate
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
