"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/lib/toast";
import { CHANNEL_LABELS, MESSAGE_CHANNELS } from "@/features/recruiter/messaging/schema";
import type { MessageChannel } from "@/features/recruiter/messaging/schema";
import { contactarPostuladosAction } from "../actions";

type Props = {
  /** Postulaciones destino. null = diálogo cerrado. */
  target: string[] | null;
  jobId: string;
  jobTitle: string;
  onClose: () => void;
  onSent: () => void;
  /** Si viene, fija el canal y oculta el selector (ej. "Enviar Email" desde el menú de una
   * card puntual, donde no tiene sentido ofrecer el WhatsApp simulado). */
  fixedChannel?: MessageChannel;
};

const PLANTILLA_BASE =
  `Hola {{candidato}},\n\n` +
  `Recibimos tu postulación a {{puesto}} y nos gustaría avanzar con una primera charla. ` +
  `¿Tenés disponibilidad esta semana?\n\n` +
  `Saludos.`;

/**
 * Contacto a uno o varios postulados desde la bandeja. Mismo diálogo para el individual y
 * el lote: cada candidato recibe el mensaje con su propio nombre ({{candidato}}).
 */
export function ContactarDialog({
  target,
  jobId,
  jobTitle,
  onClose,
  onSent,
  fixedChannel,
}: Props) {
  const toast = useToast();
  const [isPending, startTransition] = useTransition();
  const [channel, setChannel] = useState<MessageChannel>(fixedChannel ?? "email");
  const [body, setBody] = useState(PLANTILLA_BASE);

  const count = target?.length ?? 0;

  function enviar() {
    if (!target) return;
    const ids = target;
    startTransition(async () => {
      const res = await contactarPostuladosAction({
        jobId,
        applicationIds: ids,
        channel,
        body,
      });
      if (!res.ok) {
        toast({ message: res.error ?? "No se pudo enviar.", variant: "danger" });
        return;
      }
      onSent();
      onClose();
      toast({
        message:
          `${res.hechas} mensaje${res.hechas !== 1 ? "s" : ""} enviado${res.hechas !== 1 ? "s" : ""}` +
          (res.saltadas ? ` · ${res.saltadas} saltado${res.saltadas !== 1 ? "s" : ""}` : ""),
        variant: "success",
      });
    });
  }

  return (
    <Dialog
      open={target != null}
      onClose={onClose}
      side="center"
      title={count === 1 ? "Contactar candidato" : `Contactar ${count} candidatos`}
      className="max-w-md"
    >
      <div className="flex flex-col gap-4">
        {!fixedChannel && (
          <Select
            label="Canal"
            value={channel}
            onChange={(e) => setChannel(e.target.value as MessageChannel)}
          >
            {MESSAGE_CHANNELS.map((c) => (
              <option key={c} value={c}>
                {CHANNEL_LABELS[c]}
              </option>
            ))}
          </Select>
        )}

        <div className="flex flex-col gap-1.5">
          <Textarea
            label="Mensaje"
            rows={6}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="resize-y"
          />
          <p className="text-[11px] text-muted">
            Variables: <code>{"{{candidato}}"}</code> y <code>{"{{puesto}}"}</code> ({jobTitle}).
          </p>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded text-sm font-semibold text-muted outline-none hover:text-text focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
          >
            Cancelar
          </button>
          <Button
            variant="primary"
            loading={isPending}
            disabled={body.trim().length === 0}
            onClick={enviar}
          >
            Enviar
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
