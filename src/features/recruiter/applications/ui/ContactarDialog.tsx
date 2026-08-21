"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/lib/toast";
import { CHANNEL_LABELS, MESSAGE_CHANNELS } from "@/features/recruiter/messaging/schema";
import type { MessageChannel } from "@/features/recruiter/messaging/schema";
import { contactarPostuladosAction } from "../actions";
import { personalizarMensaje } from "../domain/personalizar-mensaje";

type Props = {
  /** Postulaciones destino. null = diálogo cerrado. */
  target: string[] | null;
  jobId: string;
  jobTitle: string;
  /** Nombre del candidato, si `target` tiene un solo elemento — precompleta {{candidato}}
   *  en el mensaje inicial. Sin este dato (lote de varios), la variable queda sin resolver:
   *  cada destinatario recibe el mensaje con su propio nombre recién al enviar. */
  candidateName?: string;
  onClose: () => void;
  onSent: () => void;
  /** Si viene, fija el canal y oculta el selector (ej. "Enviar Email" desde el menú de una
   * card puntual, donde no tiene sentido ofrecer el WhatsApp simulado). */
  fixedChannel?: MessageChannel;
  /** true si el recruiter conectó Google con el scope de envío — solo importa para el canal
   *  email (whatsapp sigue mock, no depende de esto). */
  canSendEmail: boolean;
};

const ASUNTO_BASE = "Sobre tu postulación a {{puesto}}";

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
  candidateName,
  onClose,
  onSent,
  fixedChannel,
  canSendEmail,
}: Props) {
  const toast = useToast();
  const [isPending, startTransition] = useTransition();
  const [channel, setChannel] = useState<MessageChannel>(fixedChannel ?? "email");
  const blockedByGoogle = channel === "email" && !canSendEmail;
  const [subject, setSubject] = useState(() =>
    personalizarMensaje(ASUNTO_BASE, { puesto: jobTitle, candidato: candidateName }),
  );
  const [body, setBody] = useState(() =>
    personalizarMensaje(PLANTILLA_BASE, { puesto: jobTitle, candidato: candidateName }),
  );

  const count = target?.length ?? 0;

  function enviar() {
    if (!target) return;
    const ids = target;
    onClose(); // no bloquear: el envío sigue en background, no hace falta el modal abierto
    startTransition(async () => {
      const res = await contactarPostuladosAction({
        jobId,
        applicationIds: ids,
        channel,
        subject,
        body,
      });
      if (!res.ok) {
        toast({ message: res.error ?? "No se pudo enviar.", variant: "danger" });
        return;
      }
      onSent();
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
        {blockedByGoogle && (
          <p className="rounded-[var(--radius)] border border-border bg-bg px-3 py-2 text-xs text-muted">
            Conectá tu Google en{" "}
            <a href="/settings" className="font-semibold text-primary hover:text-primary-hover">
              Configuración
            </a>{" "}
            para poder enviar emails reales desde tu cuenta.
          </p>
        )}

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

        <Input
          label="Asunto"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />

        <div className="flex flex-col gap-2">
          <Textarea
            label="Mensaje"
            rows={6}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="resize-y"
          />
          {!candidateName && (
            <p className="text-[11px] text-muted">
              Cada candidato recibe el mensaje con su propio nombre en lugar
              de <code>{"{{candidato}}"}</code>.
            </p>
          )}
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
            disabled={blockedByGoogle || subject.trim().length === 0 || body.trim().length === 0}
            onClick={enviar}
          >
            Enviar
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
