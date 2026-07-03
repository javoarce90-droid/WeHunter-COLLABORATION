"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/lib/toast";
import { CHANNEL_LABELS, MESSAGE_CHANNELS, type MessageChannel } from "../schema";
import {
  enviarMensajeAction,
  loadThreadAction,
  crearTemplateAction,
  eliminarTemplateAction,
} from "../actions";
import type { ThreadListRow, MessageRow, ThreadHeader, TemplateRow } from "../data/messaging.queries";

type Conversation = { header: ThreadHeader; messages: MessageRow[] };

type Props = {
  threads: ThreadListRow[];
  candidates: { id: string; fullName: string }[];
  templates: TemplateRow[];
};

const timeFmt = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

const fieldClass =
  "w-full rounded-[var(--radius)] border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-[var(--focus-ring)]";

export function Inbox({ threads, candidates, templates }: Props) {
  const [, startLoad] = useTransition();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [tplOpen, setTplOpen] = useState(false);

  function openThread(threadId: string) {
    setSelectedId(threadId);
    setConversation(null);
    startLoad(async () => {
      const conv = await loadThreadAction(threadId);
      setConversation(conv);
    });
  }

  function reload() {
    if (selectedId) {
      loadThreadAction(selectedId).then(setConversation);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-xl font-bold text-text">Mensajes</h1>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setTplOpen(true)}>
            Templates
          </Button>
          <Button size="sm" onClick={() => setNewOpen(true)}>
            + Nuevo mensaje
          </Button>
        </div>
      </div>

      {/* Honestidad: el envío todavía no se entrega de verdad (sin Gmail/WhatsApp real). */}
      <p className="rounded-[var(--radius)] border border-border bg-bg px-3 py-2 text-xs text-muted">
        Modo borrador: los mensajes se registran en el historial. El envío real por Gmail/WhatsApp
        se conecta más adelante.
      </p>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        {/* Lista de hilos */}
        <div className="overflow-hidden rounded-[var(--radius)] border border-border bg-surface shadow-[var(--shadow)]">
          {threads.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted">
              No hay conversaciones todavía.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {threads.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => openThread(t.id)}
                    className={[
                      "flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition-colors",
                      selectedId === t.id ? "bg-[var(--selected-bg)]" : "hover:bg-bg",
                    ].join(" ")}
                  >
                    <Avatar name={t.candidateName} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-semibold text-text">
                          {t.candidateName}
                        </span>
                        <Badge variant={t.channel === "whatsapp" ? "success" : "blue"}>
                          {CHANNEL_LABELS[t.channel]}
                        </Badge>
                      </div>
                      {t.preview && (
                        <p className="truncate text-xs text-muted">{t.preview}</p>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Conversación */}
        <div className="flex min-h-[420px] flex-col rounded-[var(--radius)] border border-border bg-surface shadow-[var(--shadow)]">
          {!selectedId ? (
            <div className="grid flex-1 place-items-center p-8">
              <EmptyState
                icon={<ChatBubbleIcon />}
                title="Elegí una conversación"
                description="Seleccioná un hilo de la lista para ver los mensajes, o iniciá una conversación nueva."
                action={{ label: "+ Nuevo mensaje", onClick: () => setNewOpen(true) }}
                variant="plain"
              />
            </div>
          ) : !conversation ? (
            <p className="grid flex-1 place-items-center text-sm text-muted">Cargando…</p>
          ) : (
            <Conversation conversation={conversation} templates={templates} onSent={reload} />
          )}
        </div>
      </div>

      {newOpen && (
        <NewMessageDialog
          candidates={candidates}
          templates={templates}
          onClose={() => setNewOpen(false)}
          onSent={(threadId) => {
            setNewOpen(false);
            openThread(threadId);
          }}
        />
      )}
      {tplOpen && <TemplatesDialog templates={templates} onClose={() => setTplOpen(false)} />}
    </div>
  );
}

function Conversation({
  conversation,
  templates,
  onSent,
}: {
  conversation: Conversation;
  templates: TemplateRow[];
  onSent: () => void;
}) {
  const toast = useToast();
  const [body, setBody] = useState("");
  const [sending, startSend] = useTransition();
  const { header, messages } = conversation;
  const channelTemplates = templates.filter((t) => t.channel === header.channel);

  function send() {
    if (!body.trim()) return;
    startSend(async () => {
      const res = await enviarMensajeAction(header.candidateId, header.channel, body);
      if (!res.ok) {
        toast({ message: res.error ?? "No se pudo enviar.", variant: "danger" });
        return;
      }
      setBody("");
      onSent();
    });
  }

  return (
    <>
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2.5">
          <Avatar name={header.candidateName} size="sm" />
          <div>
            <p className="text-sm font-semibold text-text">{header.candidateName}</p>
            {header.candidateEmail && (
              <p className="text-xs text-muted">{header.candidateEmail}</p>
            )}
          </div>
        </div>
        <Badge variant={header.channel === "whatsapp" ? "success" : "blue"}>
          {CHANNEL_LABELS[header.channel]}
        </Badge>
      </header>

      <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <p className="m-auto text-sm text-muted">Sin mensajes todavía.</p>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={["max-w-[80%] rounded-[var(--radius)] px-3 py-2 text-sm",
                m.direction === "outbound"
                  ? "self-end bg-primary-light text-text"
                  : "self-start bg-bg text-text",
              ].join(" ")}
            >
              <p className="whitespace-pre-wrap">{m.body}</p>
              <p className="mt-1 text-[10px] text-muted">{timeFmt.format(m.createdAt)}</p>
            </div>
          ))
        )}
      </div>

      <div className="border-t border-border p-3">
        {channelTemplates.length > 0 && (
          <select
            aria-label="Insertar template"
            defaultValue=""
            onChange={(e) => {
              const tpl = channelTemplates.find((t) => t.id === e.target.value);
              if (tpl) setBody(tpl.body);
              e.target.selectedIndex = 0;
            }}
            className="mb-2 rounded-md border border-border bg-bg px-2 py-1 text-xs text-muted"
          >
            <option value="">Insertar template…</option>
            {channelTemplates.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        )}
        <div className="flex items-end gap-2">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={2}
            aria-label={`Mensaje por ${CHANNEL_LABELS[header.channel]}`}
            placeholder={`Escribí un mensaje por ${CHANNEL_LABELS[header.channel]}…`}
            className={`${fieldClass} resize-y`}
          />
          <Button onClick={send} disabled={sending || !body.trim()}>
            {sending ? "Enviando…" : "Enviar"}
          </Button>
        </div>
      </div>
    </>
  );
}

function NewMessageDialog({
  candidates,
  templates,
  onClose,
  onSent,
}: {
  candidates: { id: string; fullName: string }[];
  templates: TemplateRow[];
  onClose: () => void;
  onSent: (threadId: string) => void;
}) {
  const toast = useToast();
  const [candidateId, setCandidateId] = useState("");
  const [channel, setChannel] = useState<MessageChannel>("email");
  const [body, setBody] = useState("");
  const [sending, startSend] = useTransition();
  const channelTemplates = templates.filter((t) => t.channel === channel);

  function send() {
    if (!candidateId || !body.trim()) {
      toast({ message: "Elegí un candidato y escribí el mensaje.", variant: "danger" });
      return;
    }
    startSend(async () => {
      const res = await enviarMensajeAction(candidateId, channel, body);
      if (!res.ok || !res.threadId) {
        toast({ message: res.error ?? "No se pudo enviar.", variant: "danger" });
        return;
      }
      onSent(res.threadId);
    });
  }

  return (
    <Dialog open onClose={onClose} side="right" className="max-w-[440px]"
      header={<p className="font-display text-base font-bold text-text">Nuevo mensaje</p>}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-muted">Candidato</label>
          <select value={candidateId} onChange={(e) => setCandidateId(e.target.value)} className={fieldClass}>
            <option value="">Seleccioná…</option>
            {candidates.map((c) => (
              <option key={c.id} value={c.id}>{c.fullName}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-muted">Canal</label>
          <select value={channel} onChange={(e) => setChannel(e.target.value as MessageChannel)} className={fieldClass}>
            {MESSAGE_CHANNELS.map((ch) => (
              <option key={ch} value={ch}>{CHANNEL_LABELS[ch]}</option>
            ))}
          </select>
        </div>
        {channelTemplates.length > 0 && (
          <select
            aria-label="Insertar template"
            defaultValue=""
            onChange={(e) => {
              const tpl = channelTemplates.find((t) => t.id === e.target.value);
              if (tpl) setBody(tpl.body);
              e.target.selectedIndex = 0;
            }}
            className="rounded-md border border-border bg-bg px-2 py-1 text-xs text-muted"
          >
            <option value="">Insertar template…</option>
            {channelTemplates.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        )}
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={5}
          placeholder="Mensaje…"
          className={`${fieldClass} resize-y`}
        />
        <div className="flex items-center justify-end gap-3">
          <button type="button" onClick={onClose} className="text-sm font-semibold text-muted hover:text-text">
            Cancelar
          </button>
          <Button onClick={send} disabled={sending}>
            {sending ? "Enviando…" : "Enviar"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function TemplatesDialog({
  templates,
  onClose,
}: {
  templates: TemplateRow[];
  onClose: () => void;
}) {
  const toast = useToast();
  const [, startDel] = useTransition();
  const [creating, setCreating] = useState(false);

  function remove(id: string) {
    startDel(async () => {
      const res = await eliminarTemplateAction(id);
      if (!res.ok) toast({ message: res.error ?? "No se pudo borrar.", variant: "danger" });
    });
  }

  return (
    <Dialog open onClose={onClose} side="right" className="max-w-[440px]"
      header={<p className="font-display text-base font-bold text-text">Templates</p>}
    >
      <div className="flex flex-col gap-4">
        {creating ? (
          <CreateTemplateForm onDone={() => setCreating(false)} onCancel={() => setCreating(false)} />
        ) : (
          <Button size="sm" onClick={() => setCreating(true)}>+ Nuevo template</Button>
        )}

        {templates.length === 0 ? (
          <p className="text-sm text-muted">Todavía no hay templates.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {templates.map((t) => (
              <li key={t.id} className="rounded-[var(--radius)] border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-text">{t.name}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant={t.channel === "whatsapp" ? "success" : "blue"}>
                      {CHANNEL_LABELS[t.channel]}
                    </Badge>
                    <button
                      type="button"
                      onClick={() => remove(t.id)}
                      className="text-xs font-semibold text-muted hover:text-danger"
                    >
                      Borrar
                    </button>
                  </div>
                </div>
                <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-xs text-muted">{t.body}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Dialog>
  );
}

function CreateTemplateForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [state, dispatch, pending] = useActionState(crearTemplateAction, {});
  // Cerrar al crear con éxito (efecto, no en render: evita setState del padre al renderizar).
  useEffect(() => {
    if (state.ok) onDone();
  }, [state.ok, onDone]);

  return (
    <form action={dispatch} className="flex flex-col gap-3 rounded-[var(--radius)] border border-border p-3">
      <input name="name" placeholder="Nombre del template" required className={fieldClass} />
      <select name="channel" defaultValue="email" className={fieldClass}>
        {MESSAGE_CHANNELS.map((ch) => (
          <option key={ch} value={ch}>{CHANNEL_LABELS[ch]}</option>
        ))}
      </select>
      <textarea name="body" rows={3} placeholder="Cuerpo del mensaje…" required className={`${fieldClass} resize-y`} />
      {state.error && <p className="text-xs text-danger">{state.error}</p>}
      <div className="flex items-center justify-end gap-3">
        <button type="button" onClick={onCancel} className="text-sm font-semibold text-muted hover:text-text">
          Cancelar
        </button>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Guardando…" : "Crear"}
        </Button>
      </div>
    </form>
  );
}

function ChatBubbleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.7a8.5 8.5 0 0 1-.9-3.8A8.38 8.38 0 0 1 12.5 3 8.38 8.38 0 0 1 21 11.5z" />
    </svg>
  );
}
