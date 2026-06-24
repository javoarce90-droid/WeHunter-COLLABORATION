"use client";

import { Button } from "@/components/ui/button";

/** Dispara el diálogo de impresión del navegador (→ guardar como PDF). */
export function PrintButton() {
  return (
    <div className="print-hide">
      <Button size="sm" onClick={() => window.print()}>
        Imprimir / Guardar PDF
      </Button>
    </div>
  );
}
