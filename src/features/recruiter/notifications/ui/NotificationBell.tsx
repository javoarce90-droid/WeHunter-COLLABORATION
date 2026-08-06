"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import type { RealtimePostgresInsertPayload } from "@supabase/supabase-js";
import { Menu } from "@/components/ui/menu";
import { IconButton } from "@/components/ui/icon-button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { NotificationRow } from "../data/notifications.queries";

const TYPE_DOT: Record<NotificationRow["type"], string> = {
  hire: "var(--success)",
  team: "var(--primary)",
  system: "var(--muted)",
  candidate_status: "var(--primary)",
  background_job: "var(--ai)",
};

/** Fila cruda de `notifications` tal como llega en el payload de Realtime (snake_case). */
type NotificationRowDb = {
  id: string;
  organization_id: string;
  type: NotificationRow["type"];
  title: string;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

function fromDbRow(row: NotificationRowDb): NotificationRow {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    link: row.link,
    readAt: row.read_at ? new Date(row.read_at) : null,
    createdAt: new Date(row.created_at),
  };
}

function relative(date: Date): string {
  const mins = Math.round((Date.now() - date.getTime()) / 60000);
  if (mins < 1) return "recién";
  if (mins < 60) return `hace ${mins} min`;
  const h = Math.round(mins / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  return `hace ${d} d`;
}

export function NotificationBell({
  items: initialItems,
  unread: initialUnread,
  onMarkRead,
  organizationId,
  profileId,
  triggerClassName,
}: {
  items: NotificationRow[];
  unread: number;
  onMarkRead: () => Promise<unknown>;
  /** Org activa: filtra los inserts de Realtime (el canal solo puede acotar por perfil).
   *  Sin `profileId` (ej. campana del candidato, que abarca varias orgs) no hay Realtime. */
  organizationId?: string;
  /** Perfil del usuario actual — el canal de Realtime escucha solo sus propias filas. */
  profileId?: string;
  /** Override de color del trigger — el default (`text-muted`) asume un header claro. */
  triggerClassName?: string;
}) {
  const [, start] = useTransition();
  const [items, setItems] = useState(initialItems);
  const [unread, setUnread] = useState(initialUnread);
  // Detecta una navegación server-rendered nueva (props frescas) para resincronizar el estado
  // local — ajustado durante el render, no en un efecto (evita un ciclo extra de render).
  const [syncedItems, setSyncedItems] = useState(initialItems);
  if (initialItems !== syncedItems) {
    setSyncedItems(initialItems);
    setItems(initialItems);
    setUnread(initialUnread);
  }

  // Entrega en vivo: si una acción lenta (IA/lote) termina mientras el usuario está en otra
  // pantalla, se entera sin esperar a la próxima navegación server-rendered ni a un F5.
  useEffect(() => {
    if (!profileId) return;
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`notifications:${profileId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `profile_id=eq.${profileId}`,
        },
        (payload: RealtimePostgresInsertPayload<NotificationRowDb>) => {
          if (payload.new.organization_id !== organizationId) return;
          setItems((prev) => [fromDbRow(payload.new), ...prev].slice(0, 20));
          setUnread((n) => n + 1);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profileId, organizationId]);

  function marcarLeidas() {
    setItems((prev) => prev.map((n) => (n.readAt ? n : { ...n, readAt: new Date() })));
    setUnread(0);
    start(async () => {
      await onMarkRead();
    });
  }

  return (
    <Menu
      align="end"
      trigger={
        <IconButton
          aria-label={`Notificaciones${unread > 0 ? `, ${unread} sin leer` : ""}`}
          variant="ghost"
          className={triggerClassName}
        >
          <span className="relative inline-flex">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {unread > 0 && (
              <span className="absolute -right-1.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-danger px-1 text-[10px] font-bold text-white tabular-nums">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </span>
        </IconButton>
      }
      className="w-[320px] p-0"
    >
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="text-sm font-bold text-text">Notificaciones</span>
        {unread > 0 && (
          <button
            type="button"
            onClick={marcarLeidas}
            className="text-xs font-semibold text-primary hover:text-primary-hover"
          >
            Marcar leídas
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <p className="px-3 py-8 text-center text-sm text-muted">No tenés notificaciones.</p>
      ) : (
        <ul className="max-h-[360px] overflow-y-auto">
          {items.map((n) => {
            const content = (
              <div
                className={[
                  "flex items-start gap-2.5 px-3 py-2.5 transition-colors hover:bg-bg",
                  n.readAt ? "" : "bg-primary-light/40",
                ].join(" ")}
              >
                <span
                  className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                  style={{ background: TYPE_DOT[n.type] }}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-text">{n.title}</p>
                  <p className="text-xs text-muted">{relative(n.createdAt)}</p>
                </div>
              </div>
            );
            return (
              <li key={n.id} className="border-b border-border last:border-0">
                {n.link ? <Link href={n.link}>{content}</Link> : content}
              </li>
            );
          })}
        </ul>
      )}
    </Menu>
  );
}
