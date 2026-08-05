"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { fieldClasses } from "@/components/ui/input";
import { generarShareAction, revocarShareAction, compartirConHMAction } from "../actions";
import type { ShortlistActionState } from "../actions";
import type { ShareRow } from "../data/shortlists.queries";

export type HMOption = { membershipId: string; name: string };

type Props = {
  shortlistId: string;
  jobId: string;
  shares: ShareRow[];
  // URL base resuelta en el server (host de la request). Va como prop para que el enlace
  // se renderice idéntico en server y cliente; usar window.location acá rompía la hidratación.
  appUrl: string;
  /** Hiring Managers activos de la org (solo si el workspace es Enterprise) — sin esto no se
   *  ofrece la opción de compartir internamente, solo el link externo al Cliente. */
  hmOptions: HMOption[];
};

function isActive(share: ShareRow): boolean {
  if (share.revokedAt) return false;
  if (share.expiresAt && new Date(share.expiresAt).getTime() < Date.now()) return false;
  return true;
}

const selectClass = fieldClasses();

export function ShareControls({ shortlistId, jobId, shares, appUrl, hmOptions }: Props) {
  const shareUrl = (token: string) => `${appUrl}/share/${token}`;

  const [genState, genDispatch, genPending] = useActionState<ShortlistActionState, FormData>(
    async (prev, formData) => generarShareAction(prev, formData),
    {},
  );
  const [, revokeDispatch] = useActionState<ShortlistActionState, FormData>(
    async (prev, formData) => revocarShareAction(prev, formData),
    {},
  );
  const [hmState, hmDispatch, hmPending] = useActionState<ShortlistActionState, FormData>(
    async (prev, formData) => compartirConHMAction(prev, formData),
    {},
  );
  const [copied, setCopied] = useState<string | null>(null);
  const externalShares = shares.filter((s) => !s.sharedWithMembershipId);
  const hmShares = shares.filter((s) => s.sharedWithMembershipId);

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
          className="rounded-[var(--radius)] border border-border bg-bg px-2 py-1 text-xs text-text outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
        >
          <option value="7">Vence en 7 días</option>
          <option value="30">Vence en 30 días</option>
          <option value="">Sin vencimiento</option>
        </select>
        <Button type="submit" size="sm" variant="secondary" loading={genPending}>
          Generar enlace
        </Button>
        {genState.error && <span className="text-xs text-danger">{genState.error}</span>}
      </form>

      {externalShares.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {externalShares.map((share) => {
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
                      className="rounded font-semibold text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                    >
                      {copied === share.token ? "¡Copiado!" : "Copiar"}
                    </button>
                    <form action={revokeDispatch} className="inline">
                      <input type="hidden" name="shareId" value={share.id} />
                      <input type="hidden" name="jobId" value={jobId} />
                      <button
                        type="submit"
                        className="rounded font-semibold text-danger outline-none hover:underline focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-danger)]"
                      >
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

      {hmOptions.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-border pt-3">
          <form action={hmDispatch} className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="shortlistId" value={shortlistId} />
            <input type="hidden" name="jobId" value={jobId} />
            <select name="membershipId" defaultValue="" required className={selectClass}>
              <option value="" disabled>
                Compartir con un Hiring Manager
              </option>
              {hmOptions.map((hm) => (
                <option key={hm.membershipId} value={hm.membershipId}>
                  {hm.name}
                </option>
              ))}
            </select>
            <Button type="submit" size="sm" variant="secondary" loading={hmPending}>
              Compartir
            </Button>
            {hmState.error && <span className="text-xs text-danger">{hmState.error}</span>}
          </form>

          {hmShares.length > 0 && (
            <ul className="flex flex-col gap-1.5">
              {hmShares.map((share) => (
                <li key={share.id} className="flex flex-wrap items-center gap-2 text-xs text-muted">
                  <span className="text-text">{share.sharedWithName ?? "Hiring Manager"}</span>
                  {isActive(share) ? (
                    <form action={revokeDispatch} className="inline">
                      <input type="hidden" name="shareId" value={share.id} />
                      <input type="hidden" name="jobId" value={jobId} />
                      <button
                        type="submit"
                        className="rounded font-semibold text-danger outline-none hover:underline focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-danger)]"
                      >
                        Quitar acceso
                      </button>
                    </form>
                  ) : (
                    <span className="italic">Revocado</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
