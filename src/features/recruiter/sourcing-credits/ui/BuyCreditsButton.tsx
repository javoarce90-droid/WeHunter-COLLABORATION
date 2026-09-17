"use client";

import { useState } from "react";
import { PlusCircle } from "lucide-react";
import { Button, type ButtonSize } from "@/components/ui/button";
import { BuyCreditsDialog } from "./BuyCreditsDialog";

/**
 * Botón "Comprar créditos" + el modal de selección de paquete que abre — un solo componente
 * reusado en el chip del topbar, Configuración → Plan y el estado bloqueado de Sourcing.
 */
export function BuyCreditsButton({
  size = "default",
  className = "",
}: {
  size?: ButtonSize;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="primary" size={size} className={className} onClick={() => setOpen(true)}>
        <PlusCircle className="h-3.5 w-3.5" />
        Comprar créditos
      </Button>
      <BuyCreditsDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
