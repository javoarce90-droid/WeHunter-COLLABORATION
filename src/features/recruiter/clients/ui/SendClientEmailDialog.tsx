"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { fieldLabelClass } from "@/components/ui/input";
import { useToast } from "@/lib/toast";
import { enviarEmailAClienteAction } from "../actions";

export type EmailLink = { label: string; url: string };

type Props = {
  clientId: string;
  clientName: string;
  contactName: string | null;
  contactEmail: string | null;
  /** true si el recruiter conectó Google con el scope de envío. */
  canSendEmail: boolean;
  /** Enlaces vigentes que se pueden pegar en el cuerpo (portal del cliente, shortlists). */
  insertableLinks: EmailLink[];
};

export function SendClientEmailDialog({
  clientId,
  clientName,
  contactName,
  contactEmail,
  canSendEmail,
  insertableLinks,
}: Props) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const noEmail = !contactEmail;
  const blocked = noEmail || !canSendEmail;

  function reset() {
    setSubject("");
    setBody("");
  }

  function insertLink(link: EmailLink) {
    setBody((prev) => {
      const line = `${link.label}: ${link.url}`;
      if (!prev.trim()) return line;
      return `${prev.replace(/\s+$/, "")}\n\n${line}`;
    });
  }

  function enviar() {
    if (blocked) return;
    const fd = new FormData();
    fd.set("clientId", clientId);
    fd.set("subject", subject);
    fd.set("body", body);
    startTransition(async () => {
      const res = await enviarEmailAClienteAction({}, fd);
      if (res.error) {
        toast({ message: res.error, variant: "danger" });
        return;
      }
      setOpen(false);
      reset();
      router.refresh();
      toast({ message: `Email enviado a ${clientName}.`, variant: "success" });
    });
  }

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setOpen(true)}
        disabled={noEmail}
        title={noEmail ? "Cargá un email de contacto para escribirle" : undefined}
      >
        <Mail className="h-4 w-4" aria-hidden />
        Enviar email
      </Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        side="center"
        title={`Escribirle a ${clientName}`}
        className="max-w-xl"
      >
        <div className="flex flex-col gap-5">
          {!canSendEmail && (
            <p className="rounded-[var(--radius)] border border-border bg-bg px-4 py-3 text-xs text-muted">
              Conectá tu cuenta de Google en{" "}
              <a
                href="/settings"
                className="font-semibold text-primary hover:text-primary-hover"
              >
                Configuración
              </a>{" "}
              para enviar emails desde tu casilla.
            </p>
          )}

          <div className="flex flex-col gap-1">
            <span className={fieldLabelClass}>Para</span>
            <p className="rounded-[var(--radius)] border border-border bg-bg px-3 py-3 text-sm text-text">
              {contactName ? (
                <>
                  {contactName}{" "}
                  <span className="text-muted">&lt;{contactEmail}&gt;</span>
                </>
              ) : (
                contactEmail
              )}
            </p>
          </div>

          <Input
            label="Asunto"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            maxLength={200}
          />

          <div className="flex flex-col gap-2">
            <Textarea
              label="Mensaje"
              rows={9}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={5000}
              className="resize-y"
            />
            {insertableLinks.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-muted">Insertar enlace</span>
                {insertableLinks.map((link) => (
                  <button
                    key={link.url}
                    type="button"
                    onClick={() => insertLink(link)}
                    className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted transition-colors hover:bg-bg hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                  >
                    {link.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded text-sm font-semibold text-muted outline-none transition-colors hover:text-text focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
            >
              Cancelar
            </button>
            <Button
              variant="primary"
              loading={isPending}
              disabled={blocked || subject.trim().length === 0 || body.trim().length === 0}
              onClick={enviar}
            >
              Enviar email
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
