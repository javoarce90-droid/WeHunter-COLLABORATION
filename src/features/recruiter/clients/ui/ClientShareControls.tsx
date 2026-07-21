"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { generarClientShareAction, revocarClientShareAction } from "../actions";
import type { ClientShareState } from "../actions";
import type { ClientShareRow } from "../data/client-shares.data";

type Props = {
  clientId: string;
  shares: ClientShareRow[];
  // URL base resuelta en el server (host de la request). Va como prop para que el enlace
  // se renderice idéntico en server y cliente; usar window.location acá rompía la hidratación.
  appUrl: string;
};

function isActive(share: ClientShareRow): boolean {
  if (share.revokedAt) return false;
  if (share.expiresAt && new Date(share.expiresAt).getTime() < Date.now()) return false;
  return true;
}

export function ClientShareControls({ clientId, shares, appUrl }: Props) {
  const shareUrl = (token: string) => `${appUrl}/client/${token}`;

  const [genState, genDispatch, genPending] = useActionState<ClientShareState, FormData>(
    async (prev, formData) => generarClientShareAction(prev, formData),
    {},
  );
  const [, revokeDispatch] = useActionState<ClientShareState, FormData>(
    async (prev, formData) => revocarClientShareAction(prev, formData),
    {},
  );
  const [copied, setCopied] = useState<string | null>(null);

  async function copy(token: string) {
    try {
      await navigator.clipboard.writeText(shareUrl(token));
      setCopied(token);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      // sin clipboard: no-op
    }
  }

  return (
    <section className="rounded-[var(--radius)] border border-border bg-surface p-5 shadow-[var(--shadow)]">
      <h2 className="text-sm font-bold text-text">Portal del cliente</h2>
      <p className="mt-1 max-w-[70ch] text-sm text-muted">
        Con este enlace el cliente puede pedir búsquedas y seguir el estado de sus
        solicitudes, sin necesidad de crear una cuenta.
      </p>

      <form action={genDispatch} className="mt-3 flex flex-wrap items-center gap-2">
        <input type="hidden" name="clientId" value={clientId} />
        <select
          name="expiresInDays"
          defaultValue=""
          className="rounded-[var(--radius)] border border-border bg-bg px-2 py-1 text-xs text-text outline-none focus:border-primary"
        >
          <option value="">Sin vencimiento</option>
          <option value="30">Vence en 30 días</option>
          <option value="90">Vence en 90 días</option>
        </select>
        <Button type="submit" size="sm" variant="secondary" disabled={genPending}>
          {genPending ? "Generando…" : "Generar enlace"}
        </Button>
        {genState.error && <span className="text-xs text-danger">{genState.error}</span>}
      </form>

      {shares.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1.5">
          {shares.map((share) => {
            const active = isActive(share);
            return (
              <li key={share.id} className="flex flex-wrap items-center gap-2 text-xs text-muted">
                <code className="max-w-[280px] truncate rounded bg-bg px-2 py-1 text-[11px]">
                  {shareUrl(share.token)}
                </code>
                {active ? (
                  <>
                    <button
                      type="button"
                      onClick={() => copy(share.token)}
                      className="font-semibold text-primary hover:underline"
                    >
                      {copied === share.token ? "¡Copiado!" : "Copiar"}
                    </button>
                    <form action={revokeDispatch} className="inline">
                      <input type="hidden" name="shareId" value={share.id} />
                      <input type="hidden" name="clientId" value={clientId} />
                      <button type="submit" className="font-semibold text-danger hover:underline">
                        Revocar
                      </button>
                    </form>
                  </>
                ) : (
                  <span className="italic">{share.revokedAt ? "Revocado" : "Vencido"}</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
