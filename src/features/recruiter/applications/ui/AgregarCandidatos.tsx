"use client";

import { type ReactNode, useActionState, useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { SearchInput } from "@/components/ui/search-input";
import { useToast } from "@/lib/toast";
import { CANDIDATE_SOURCE_LABELS } from "@/features/recruiter/candidates/ui/source-meta";
import { crearYPostularCandidatoAction, postularVariosAction } from "../actions";

type PoolCandidate = { id: string; fullName: string; email: string | null };

type Props = { jobId: string; poolCandidates: PoolCandidate[] };

type Tab = "pool" | "nuevo";

const initialState: { error?: string } = {};

/**
 * Punto de entrada contextual para sumar candidatos a una búsqueda SIN salir del pipeline:
 * - "Del pool": multi-select de candidatos existentes → postularVariosAction.
 * - "Nuevo": alta rápida (nombre + email + skills + fuente) que crea y postula en un paso.
 */
export function AgregarCandidatos({ jobId, poolCandidates }: Props) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>(poolCandidates.length > 0 ? "pool" : "nuevo");
  // Remonta el form del alta para limpiarlo tras un envío exitoso (inputs no controlados).
  const [formKey, setFormKey] = useState(0);

  // ── Tab "Del pool" ──────────────────────────────────────────────────────────
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [poolPending, startPool] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return poolCandidates;
    return poolCandidates.filter(
      (c) => c.fullName.toLowerCase().includes(q) || (c.email ?? "").toLowerCase().includes(q),
    );
  }, [poolCandidates, query]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function close() {
    setOpen(false);
    setSelected(new Set());
    setQuery("");
    setFormKey((k) => k + 1);
  }

  function postularSeleccionados() {
    const ids = [...selected];
    if (ids.length === 0) return;
    startPool(async () => {
      const res = await postularVariosAction(jobId, ids);
      if (!res.ok) {
        toast({ message: res.error ?? "No se pudo postular.", variant: "danger" });
        return;
      }
      const msg =
        `${res.added} candidato${res.added !== 1 ? "s" : ""} al pipeline` +
        (res.skipped ? ` · ${res.skipped} ya estaban` : "");
      toast({ message: msg, variant: "success" });
      close();
    });
  }

  // ── Tab "Nuevo" ─────────────────────────────────────────────────────────────
  const [state, dispatch, formPending] = useActionState<{ error?: string }, FormData>(
    async (prev, formData) => {
      const result = await crearYPostularCandidatoAction(prev, formData);
      if (!result.error) {
        toast({ message: "Candidato creado y postulado.", variant: "success" });
        close();
      }
      return result;
    },
    initialState,
  );

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        + Agregar candidatos
      </Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        side="right"
        title="Agregar candidatos"
        className="w-[440px]"
      >
        <div className="mb-4 flex gap-1 rounded-[var(--radius)] bg-text/[0.04] p-1">
          <TabButton active={tab === "pool"} onClick={() => setTab("pool")}>
            Del pool
          </TabButton>
          <TabButton active={tab === "nuevo"} onClick={() => setTab("nuevo")}>
            Nuevo candidato
          </TabButton>
        </div>

        {tab === "pool" ? (
          poolCandidates.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">
              No hay candidatos disponibles en el pool. Creá uno en la pestaña{" "}
              <button
                type="button"
                onClick={() => setTab("nuevo")}
                className="font-semibold text-primary hover:underline"
              >
                Nuevo candidato
              </button>
              .
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              <SearchInput
                value={query}
                onChange={setQuery}
                placeholder="Buscar en el pool…"
                aria-label="Buscar candidatos del pool"
                className="max-w-none"
              />

              <div className="flex max-h-[50vh] flex-col gap-0.5 overflow-y-auto">
                {filtered.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted">Sin resultados.</p>
                ) : (
                  filtered.map((c) => (
                    <label
                      key={c.id}
                      className="flex cursor-pointer items-center gap-3 rounded-[var(--radius)] px-2 py-2 hover:bg-text/[0.04]"
                    >
                      <Checkbox
                        checked={selected.has(c.id)}
                        onChange={() => toggle(c.id)}
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-text">
                          {c.fullName}
                        </span>
                        {c.email && (
                          <span className="block truncate text-xs text-muted">{c.email}</span>
                        )}
                      </span>
                    </label>
                  ))
                )}
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-border pt-3">
                <button
                  type="button"
                  onClick={close}
                  className="text-sm font-semibold text-muted hover:text-text"
                >
                  Cancelar
                </button>
                <Button
                  type="button"
                  onClick={postularSeleccionados}
                  disabled={selected.size === 0 || poolPending}
                >
                  {poolPending
                    ? "Postulando…"
                    : `Postular${selected.size > 0 ? ` (${selected.size})` : ""}`}
                </Button>
              </div>
            </div>
          )
        ) : (
          <form key={formKey} action={dispatch} className="flex flex-col gap-4">
            <input type="hidden" name="jobId" value={jobId} />

            <Input name="fullName" label="Nombre y apellido" required autoFocus placeholder="Juana Pérez" />
            <Input name="email" type="email" label="Email (opcional)" placeholder="juana@ejemplo.com" />
            <Input
              name="skills"
              label="Skills (opcional)"
              placeholder="React, TypeScript, Node"
            />

            <div className="flex flex-col gap-1.5">
              <label htmlFor="source" className="text-xs font-semibold text-muted">
                Fuente (opcional)
              </label>
              <select
                id="source"
                name="source"
                defaultValue=""
                className="w-full rounded-[var(--radius)] border border-border bg-surface px-3 py-2.5 text-sm text-text outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-[var(--focus-ring)]"
              >
                <option value="">Sin especificar</option>
                {Object.entries(CANDIDATE_SOURCE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {state.error && <p className="text-xs text-danger">{state.error}</p>}

            <div className="flex items-center justify-end gap-3 border-t border-border pt-3">
              <button
                type="button"
                onClick={close}
                className="text-sm font-semibold text-muted hover:text-text"
              >
                Cancelar
              </button>
              <Button type="submit" disabled={formPending}>
                {formPending ? "Creando…" : "Crear y postular"}
              </Button>
            </div>
          </form>
        )}
      </Dialog>
    </>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex-1 rounded-[calc(var(--radius)-2px)] px-3 py-1.5 text-sm font-semibold transition-colors",
        active ? "bg-surface text-text shadow-sm" : "text-muted hover:text-text",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
