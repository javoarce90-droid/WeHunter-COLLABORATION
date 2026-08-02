"use client";

import { useActionState } from "react";
import Link from "next/link";
import { register, type AuthFormState } from "../actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { AccountTypeTabs } from "@/components/ui/account-type-tabs";
import { SocialAuthButtons } from "@/components/auth/SocialAuthButtons";

const initialState: AuthFormState = {};

export function RegisterForm() {
  const [state, formAction, pending] = useActionState(register, initialState);

  return (
    <>
      {!state.message && <AccountTypeTabs />}
      <Card>
        <CardContent className="flex flex-col gap-4">
          {state.message ? (
            <p className="text-sm text-text">{state.message}</p>
          ) : (
            <form action={formAction} className="flex flex-col gap-4">
              <Input
                label="Nombre completo"
                name="fullName"
                type="text"
                autoComplete="name"
                required
              />
              <Input
                label="Email"
                name="email"
                type="email"
                autoComplete="email"
                required
              />
              <Input
                label="Contraseña"
                name="password"
                type="password"
                autoComplete="new-password"
                required
              />
              {state.error && (
                <p className="text-xs text-danger">{state.error}</p>
              )}
              <label className="inline-flex cursor-pointer items-start gap-2 text-xs text-text">
                <Checkbox name="acceptTerms" required className="mt-0.5" />
                <span>
                  Acepto los{" "}
                  <Link href="/legal/terminos" target="_blank" className="font-semibold text-primary hover:underline">
                    Términos y condiciones
                  </Link>
                </span>
              </label>
              <Button type="submit" disabled={pending}>
                {pending ? "Creando cuenta…" : "Crear cuenta"}
              </Button>
            </form>
          )}
          {!state.message && <SocialAuthButtons realm="recruiter" />}
          <p className="text-center text-xs text-muted">
            ¿Ya tenés cuenta?{" "}
            <Link href="/login" className="font-semibold text-primary">
              Ingresá
            </Link>
          </p>
        </CardContent>
      </Card>
    </>
  );
}
