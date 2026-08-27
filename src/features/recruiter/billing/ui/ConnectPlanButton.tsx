"use client";

import { useTransition } from "react";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/lib/toast";
import { iniciarSuscripcionAction } from "../actions";

/**
 * Botón que arranca la conexión con dLocal Go. En caso OK la server action redirige al
 * checkout hosteado (no vuelve acá); si falla, se muestra el motivo en un toast.
 * Compartido entre la card de Inicio y la pantalla de pago.
 */
export function ConnectPlanButton({
  children = "Conectar dLocal Go",
  variant = "primary",
  size = "default",
  full = false,
}: {
  children?: React.ReactNode;
  variant?: "primary" | "secondary";
  size?: "default" | "sm";
  full?: boolean;
}) {
  const toast = useToast();
  const [pending, start] = useTransition();

  function connect() {
    start(async () => {
      const res = await iniciarSuscripcionAction();
      if (res?.error) toast({ message: res.error, variant: "danger" });
    });
  }

  return (
    <Button
      variant={variant}
      size={size}
      loading={pending}
      onClick={connect}
      className={full ? "w-full" : undefined}
    >
      {children}
      <ArrowUpRight className="h-4 w-4" aria-hidden />
    </Button>
  );
}
