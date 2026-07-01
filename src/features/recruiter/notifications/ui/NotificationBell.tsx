"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Menu } from "@/components/ui/menu";
import { IconButton } from "@/components/ui/icon-button";
import { marcarLeidasAction } from "../actions";
import type { NotificationRow } from "../data/notifications.queries";

const TYPE_DOT: Record<NotificationRow["type"], string> = {
  hire: "var(--success)",
  team: "var(--primary)",
  system: "var(--muted)",
};

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
  items,
  unread,
}: {
  items: NotificationRow[];
  unread: number;
}) {
  const [, start] = useTransition();

  function marcarLeidas() {
    start(async () => {
      await marcarLeidasAction();
    });
  }

  return (
    <Menu
      align="end"
      trigger={
        <IconButton aria-label={`Notificaciones${unread > 0 ? `, ${unread} sin leer` : ""}`} variant="ghost">
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
