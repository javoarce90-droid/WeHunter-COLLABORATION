"use client";

import { useTransition } from "react";
import { useToast } from "@/lib/toast";
import { desconectarGoogleCalendarAction } from "../actions";

export function DisconnectGoogleCalendarButton() {
  const toast = useToast();
  const [isPending, startTransition] = useTransition();

  function desconectar() {
    startTransition(async () => {
      const res = await desconectarGoogleCalendarAction();
      if (!res.ok) {
        toast({ message: res.error ?? "No se pudo desconectar.", variant: "danger" });
        return;
      }
      toast({ message: "Google Calendar desconectado.", variant: "success" });
    });
  }

  return (
    <button
      type="button"
      onClick={desconectar}
      disabled={isPending}
      className="text-xs font-semibold text-muted hover:text-danger disabled:opacity-50"
    >
      {isPending ? "Desconectando…" : "Desconectar"}
    </button>
  );
}
