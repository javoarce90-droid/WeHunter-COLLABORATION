"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { waHref } from "@/features/recruiter/candidates/ui/whatsapp";

export type WhatsappTarget = { candidateName: string; phone: string | null };

type Props = {
  target: WhatsappTarget | null;
  jobTitle: string;
  onClose: () => void;
};

function template(candidateName: string, jobTitle: string): string {
  const first = candidateName.split(" ")[0];
  return `Hola ${first}, te contactamos por la búsqueda de ${jobTitle}. ¿Podemos coordinar una charla?`;
}

/**
 * WhatsApp real (click-to-chat wa.me), no el hilo de mensajería interna simulada — mismo
 * mecanismo que ya usa la ficha de candidato. El montaje se resetea por candidato vía `key`
 * en el caller (mismo patrón que el resto de los sheets/diálogos de esta feature).
 */
export function SendWhatsappDialog({ target, jobTitle, onClose }: Props) {
  const [message, setMessage] = useState(() =>
    target ? template(target.candidateName, jobTitle) : "",
  );

  function abrir() {
    if (!target?.phone) return;
    window.open(waHref(target.phone, message), "_blank", "noopener,noreferrer");
    onClose();
  }

  return (
    <Dialog
      open={target != null}
      onClose={onClose}
      side="center"
      title={target ? `WhatsApp a ${target.candidateName}` : "WhatsApp"}
      className="max-w-md"
    >
      {target &&
        (target.phone ? (
          <div className="flex flex-col gap-4">
            <Textarea
              label="Mensaje (editable)"
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="resize-y"
            />
            <p className="text-[11px] text-muted">
              Abre WhatsApp con el mensaje precargado — la conversación sigue ahí, no en
              WeHunter.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded text-sm font-semibold text-muted outline-none hover:text-text focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
              >
                Cancelar
              </button>
              <Button variant="primary" disabled={message.trim().length === 0} onClick={abrir}>
                Abrir WhatsApp
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted">Este candidato no tiene teléfono cargado.</p>
        ))}
    </Dialog>
  );
}
