"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/lib/toast";
import { cancelarSuscripcionAction } from "../actions";

/** Da de baja el plan. Acción recuperable (se puede reconectar) — sin modal de confirmación,
 *  el toast deja claro hasta cuándo sigue el acceso. */
export function CancelPlanButton({ activeUntilLabel }: { activeUntilLabel: string | null }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();

  function cancel() {
    start(async () => {
      const res = await cancelarSuscripcionAction();
      if (res?.error) {
        toast({ message: res.error, variant: "danger" });
        return;
      }
      router.refresh();
      toast({
        message: activeUntilLabel
          ? `Plan cancelado. Tenés acceso hasta el ${activeUntilLabel}.`
          : "Plan cancelado.",
      });
    });
  }

  return (
    <Button variant="ghost" size="sm" loading={pending} onClick={cancel}>
      Cancelar plan
    </Button>
  );
}
