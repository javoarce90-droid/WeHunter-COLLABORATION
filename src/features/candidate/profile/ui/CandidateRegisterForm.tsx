"use client";

import { useActionState } from "react";
import Link from "next/link";
import { candidateRegisterAction, type AuthFormState } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

const initialState: AuthFormState = {};

export function CandidateRegisterForm() {
  const [state, formAction, pending] = useActionState(candidateRegisterAction, initialState);

  return (
    <Card className="border border-border/80 shadow-[0_1px_3px_rgba(0,0,0,0.08),0_4px_12px_rgba(0,0,0,0.04)] animate-pop-in">
      <CardContent className="flex flex-col gap-5 p-6">
        {state.message ? (
          <div className="flex flex-col gap-4 text-center p-2 animate-pop-in">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-light animate-pulse">
              <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 19v-8.93a2 2 0 01.89-1.664l8-4.666a2 2 0 012.22 0l8 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-2.25-1.5a2 2 0 00-2.25 0l-2.25 1.5" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-text font-display">Confirmá tu email</h2>
            <p className="text-sm text-muted leading-relaxed">{state.message}</p>
            <Link href="/c/login" className="mt-2 font-semibold text-primary hover:text-primary-hover hover:underline transition-colors text-sm">
              Volver al inicio de sesión
            </Link>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-1 text-center mb-2">
              <h2 className="text-xl font-bold text-text font-display">Creá tu cuenta</h2>
              <p className="text-xs text-muted">Registrate como talento en WeHunter</p>
            </div>

            <form action={formAction} className="flex flex-col gap-4">
              <Input
                label="Nombre completo"
                name="fullName"
                type="text"
                autoComplete="name"
                placeholder="Juan Pérez"
                required
              />
              <Input
                label="Correo electrónico"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="juan@ejemplo.com"
                required
              />
              <Input
                label="Contraseña"
                name="password"
                type="password"
                autoComplete="new-password"
                placeholder="Mínimo 8 caracteres"
                required
              />
              {state.error && (
                <p className="text-xs font-medium text-danger bg-danger/5 p-3 rounded-[var(--radius)] border border-danger/10 animate-pop-in">
                  {state.error}
                </p>
              )}
              <Button type="submit" disabled={pending} className="mt-2 w-full font-bold">
                {pending ? "Creando cuenta…" : "Registrarme"}
              </Button>
            </form>

            <p className="text-center text-xs text-muted">
              ¿Ya tenés cuenta?{" "}
              <Link href="/c/login" className="font-semibold text-primary hover:text-primary-hover hover:underline transition-colors">
                Ingresá
              </Link>
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
