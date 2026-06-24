"use client";

import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Kbd } from "./kbd";

const OPEN_EVENT = "wh:open-command-palette";

/** Abre la command palette desde cualquier parte (ej. botón de la topbar). */
export function openCommandPalette() {
  window.dispatchEvent(new CustomEvent(OPEN_EVENT));
}

interface Command {
  id: string;
  label: string;
  group: string;
  /** Palabras extra para el match (no se muestran). */
  keywords?: string;
  hint?: ReactNode;
  perform: () => void;
}

/**
 * Command palette (⌘K / Ctrl-K) — la capa power-user que pedía PRODUCT.md ("el reclutador
 * vive dentro de la app"). Navegar y crear sin tocar el mouse. Versión 1: navegación + alta
 * rápida; el salto a candidato/búsqueda por nombre se suma cuando exista el endpoint de search.
 */
export function CommandPalette() {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const commands = useMemo<Command[]>(() => {
    const go = (href: string) => () => {
      setOpen(false);
      router.push(href);
    };
    return [
      { id: "nav-dashboard", label: "Ir a Inicio", group: "Navegación", keywords: "dashboard home", perform: go("/dashboard") },
      { id: "nav-jobs", label: "Ir a Búsquedas", group: "Navegación", keywords: "jobs busquedas", perform: go("/jobs") },
      { id: "nav-candidates", label: "Ir a Candidatos", group: "Navegación", keywords: "candidates talento pool", perform: go("/candidates") },
      { id: "nav-agenda", label: "Ir a Agenda", group: "Navegación", keywords: "interviews entrevistas calendario", perform: go("/agenda") },
      { id: "new-job", label: "Crear búsqueda", group: "Crear", keywords: "nueva job vacante", perform: go("/jobs/new") },
      { id: "new-candidate", label: "Cargar candidato", group: "Crear", keywords: "nuevo talento alta", perform: go("/candidates/new") },
    ];
  }, [router]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) =>
      `${c.label} ${c.group} ${c.keywords ?? ""}`.toLowerCase().includes(q),
    );
  }, [commands, query]);

  // Atajo global de apertura (⌘K / Ctrl-K) + evento custom para triggers de UI (botón topbar).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    function onOpen() {
      setOpen(true);
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_EVENT, onOpen);
    };
  }, []);

  // Abrir/cerrar el <dialog> y resetear estado al abrir.
  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open && !el.open) {
      el.showModal();
      setQuery("");
      setActive(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    } else if (!open && el.open) {
      el.close();
    }
  }, [open]);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    const onClose = () => setOpen(false);
    el.addEventListener("close", onClose);
    return () => el.removeEventListener("close", onClose);
  }, []);

  // Índice activo derivado (clampado al filtro actual) — sin efecto de sincronización.
  const activeIndex = filtered.length === 0 ? -1 : Math.min(active, filtered.length - 1);

  function onInputKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive(Math.min(activeIndex + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive(Math.max(activeIndex - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      filtered[activeIndex]?.perform();
    }
  }

  // Agrupar para mostrar encabezados.
  const groups = useMemo(() => {
    const map = new Map<string, Command[]>();
    for (const c of filtered) {
      const arr = map.get(c.group) ?? [];
      arr.push(c);
      map.set(c.group, arr);
    }
    return [...map.entries()];
  }, [filtered]);

  let renderIndex = -1;

  return (
    <dialog
      ref={dialogRef}
      aria-label="Paleta de comandos"
      onClick={(e) => {
        if (e.target === dialogRef.current) setOpen(false);
      }}
      className="m-0 mt-[12vh] w-full max-w-xl translate-x-[calc(50vw-50%)] bg-transparent p-0 backdrop:bg-[rgba(15,10,26,0.45)] backdrop:animate-fade-in"
    >
      <div className="animate-pop-in overflow-hidden rounded-[var(--radius)] border border-border bg-surface shadow-[var(--shadow-overlay)]">
        <div className="flex items-center gap-2.5 border-b border-border px-4">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="shrink-0 text-muted" aria-hidden>
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onInputKey}
            placeholder="Buscar acción o ir a…"
            className="w-full bg-transparent py-3.5 text-sm text-text outline-none placeholder:text-muted"
            aria-label="Buscar comando"
          />
          <Kbd>Esc</Kbd>
        </div>

        <div className="max-h-[50vh] overflow-y-auto p-1.5">
          {filtered.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted">Sin resultados para “{query}”.</p>
          ) : (
            groups.map(([group, items]) => (
              <div key={group} className="mb-1">
                <p className="px-2.5 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
                  {group}
                </p>
                {items.map((c) => {
                  renderIndex++;
                  const isActiveRow = renderIndex === activeIndex;
                  const idx = renderIndex;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onMouseMove={() => setActive(idx)}
                      onClick={c.perform}
                      className={[
                        "flex w-full items-center justify-between gap-3 rounded-md px-2.5 py-2 text-left text-sm transition-colors",
                        isActiveRow ? "bg-primary-light text-primary-hover" : "text-text",
                      ].join(" ")}
                    >
                      <span className="truncate font-medium">{c.label}</span>
                      {c.hint && <span className="shrink-0 text-xs text-muted">{c.hint}</span>}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </dialog>
  );
}
