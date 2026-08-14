"use client";

import { useActionState, useEffect, useRef, useState } from "react";
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

  // Controlados a propósito: `useActionState` remonta los inputs no controlados de un form
  // cuando la action termina (incluso si el resultado es un error) — sin esto, tipear una
  // contraseña corta y enviar borraba nombre y email también. Feedback QA ago 2026.
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);

  const fullNameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  // Foco en el campo que falló en vez de dejar el error solo abajo del form.
  useEffect(() => {
    if (!state.error) return;
    const target =
      state.field === "fullName"
        ? fullNameRef.current
        : state.field === "password"
          ? passwordRef.current
          : emailRef.current;
    target?.focus();
  }, [state.error, state.field]);

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
                ref={fullNameRef}
                label="Nombre completo"
                name="fullName"
                type="text"
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                error={state.field === "fullName" ? state.error : undefined}
                required
              />
              <Input
                ref={emailRef}
                label="Email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={state.field === "email" ? state.error : undefined}
                required
              />
              <Input
                ref={passwordRef}
                label="Contraseña"
                name="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                helperText="Mínimo 8 caracteres."
                error={state.field === "password" ? state.error : undefined}
                required
              />
              {state.error && !state.field && (
                <p className="text-xs text-danger">{state.error}</p>
              )}
              <label className="inline-flex cursor-pointer items-start gap-2 text-xs text-text">
                <Checkbox
                  name="acceptTerms"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  required
                  className="mt-1"
                />
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
