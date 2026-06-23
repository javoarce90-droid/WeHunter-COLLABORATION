"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { generarShareAction, revocarShareAction } from "../actions";
import type { ShortlistActionState } from "../actions";
import type { ShareRow } from "../data/shortlists.queries";

type Props = {
  shortlistId: string;
  jobId: string;
  shares: ShareRow[];
  // URL base resuelta en el server (host de la request). Va como prop para que el enlace
  // se renderice idéntico en server y cliente; usar window.location acá rompía la hidratación.
  appUrl: string;
};

function isActive(share: ShareRow): boolean {
  if (share.revokedAt) return false;
  if (share.expiresAt && new Date(share.expiresAt).getTime() < Date.now()) return false;
  return true;
}

export function ShareControls({ shortlistId, jobId, shares, appUrl }: Props) {
  const shareUrl = (token: string) => `${appUrl}/share/${token}`;

  const [genState, genDispatch, genPending] = useActionState<ShortlistActionState, FormData>(
    async (prev, formData) => generarShareAction(prev, formData),
    {},
  );
  const [, revokeDispatch] = useActionState<ShortlistActionState, FormData>(
    async (prev, formData) => revocarShareAction(prev, formData),
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
    <div className="flex flex-col gap-2 border-t border-border pt-3">
      <form action={genDispatch} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="shortlistId" value={shortlistId} />
        <input type="hidden" name="jobId" value={jobId} />
        <select
          name="expiresInDays"
          defaultValue="7"
          className="rounded-[var(--radius)] border border-border bg-surface px-2 py-1 text-xs text-text outline-none focus:border-primary"
        >
          <option value="7">Vence en 7 días</option>
          <option value="30">Vence en 30 días</option>
          <option value="">Sin vencimiento</option>
        </select>
        <Button type="submit" size="sm" variant="secondary" disabled={genPending}>
          {genPending ? "Generando…" : "Generar enlace"}
        </Button>
        {genState.error && <span className="text-xs text-danger">{genState.error}</span>}
      </form>

      {shares.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {shares.map((share) => {
            const active = isActive(share);
            return (
              <li
                key={share.id}
                className="flex flex-wrap items-center gap-2 text-xs text-muted"
              >
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
                      <input type="hidden" name="jobId" value={jobId} />
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
    </div>
  );
}
