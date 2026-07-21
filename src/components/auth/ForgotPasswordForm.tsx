"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import {
  requestPasswordReset,
  type AuthRealm,
  type ForgotPasswordState,
} from "@/app/auth/actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Card, CardContent } from "@/components/ui/card";

const initialState: ForgotPasswordState = {};

const LOGIN_PATH: Record<AuthRealm, string> = {
  recruiter: "/login",
  candidate: "/c/login",
};

const RESEND_SECONDS = 60;

export function ForgotPasswordForm({
  realm,
  expired = false,
}: {
  realm: AuthRealm;
  expired?: boolean;
}) {
  const [state, formAction] = useActionState(requestPasswordReset, initialState);

  if (state.sent) {
    return (
      <Card>
        <CardContent className="flex flex-col gap-4 text-center">
          <p className="text-sm text-text">
            Si existe una cuenta con ese email, te enviamos un enlace para restablecer tu
            contraseña. Revisá tu bandeja (y el spam).
          </p>
          <a
            href="https://mail.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({ variant: "primary", className: "w-full" })}
          >
            Abrir Gmail ↗
          </a>
          <form action={formAction}>
            <input type="hidden" name="realm" value={realm} />
            <input type="hidden" name="email" value={state.email ?? ""} />
            <ResendButton />
          </form>
          <Link href={LOGIN_PATH[realm]} className="text-xs font-semibold text-primary">
            Volver a iniciar sesión
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        {expired && (
          <p className="rounded-[var(--radius)] bg-danger/10 px-3 py-2 text-xs text-danger">
            El enlace expiró o ya se usó. Pedí uno nuevo.
          </p>
        )}
        <p className="text-sm text-text">
          Ingresá tu email y te mandamos un enlace para restablecer tu contraseña.
        </p>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="realm" value={realm} />
          <Input label="Email" name="email" type="email" autoComplete="email" required />
          {state.error && <p className="text-xs text-danger">{state.error}</p>}
          <SubmitButton>Enviar enlace</SubmitButton>
        </form>
        <p className="text-center text-xs text-muted">
          <Link href={LOGIN_PATH[realm]} className="font-semibold text-primary">
            Volver a iniciar sesión
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

/**
 * Botón "Reenviar" con cooldown. Arranca la cuenta regresiva al montar (el primer email ya se
 * mandó) y la reinicia cada vez que termina un reenvío. Cubre el "click rage": no se puede
 * spamear el envío, y se alinea con el rate-limit por email de Supabase.
 */
function ResendButton() {
  const { pending } = useFormStatus();
  const [cooldown, setCooldown] = useState(RESEND_SECONDS);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending) setCooldown(RESEND_SECONDS);
    wasPending.current = pending;
  }, [pending]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  return (
    <Button
      type="submit"
      variant="secondary"
      size="sm"
      className="w-full"
      loading={pending}
      disabled={pending || cooldown > 0}
    >
      {cooldown > 0 ? `Reenviar en ${cooldown}s` : "Reenviar email"}
    </Button>
  );
}
