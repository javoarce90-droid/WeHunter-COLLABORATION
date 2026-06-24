"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Menu, MenuItem, MenuLabel, MenuSeparator } from "@/components/ui/menu";
import { IconButton } from "@/components/ui/icon-button";
import { useToast } from "@/lib/toast";
import { cambiarEstadoOfertaAction } from "../actions";
import {
  OFFER_STATUS_LABELS,
  OFFER_STATUS_BADGE,
  OFFER_TRANSITIONS,
  isOfferEditable,
  type OfferStatus,
} from "../schema";
import type { OfferListRow } from "../data/offers.queries";
import { OfferDrawer, type ApplicationOption } from "./OfferDrawer";

type Props = {
  jobId: string;
  jobTitle: string;
  offers: OfferListRow[];
  applications: ApplicationOption[];
};

function formatSalary(amount: number | null, currency: string | null): string {
  if (amount == null) return "—";
  return `${currency ? currency + " " : ""}${amount.toLocaleString("es-AR")}`;
}

export function OffersTab({ jobId, jobTitle, offers, applications }: Props) {
  const toast = useToast();
  const [, startTransition] = useTransition();
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [confirmAccept, setConfirmAccept] = useState<OfferListRow | null>(null);

  function changeStatus(offer: OfferListRow, to: OfferStatus) {
    startTransition(async () => {
      const res = await cambiarEstadoOfertaAction(offer.id, to, jobId);
      if (!res.ok) {
        toast({ message: res.error ?? "No se pudo cambiar el estado.", variant: "danger" });
        return;
      }
      toast({
        message:
          to === "accepted"
            ? `Oferta aceptada · ${offer.candidateName} contratado · búsqueda cerrada`
            : `Oferta → ${OFFER_STATUS_LABELS[to]}`,
        variant: "success",
      });
    });
  }

  function onPickStatus(offer: OfferListRow, to: OfferStatus) {
    if (to === "accepted") setConfirmAccept(offer);
    else changeStatus(offer, to);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">
          {offers.length} oferta{offers.length !== 1 ? "s" : ""}
        </p>
        <Button size="sm" onClick={() => setEditing("new")} disabled={applications.length === 0}>
          + Nueva oferta
        </Button>
      </div>

      {offers.length === 0 ? (
        <EmptyState
          title="Todavía no hay ofertas"
          description={
            applications.length === 0 ? (
              "Primero postulá candidatos a esta búsqueda; después vas a poder ofertarles."
            ) : (
              <>
                Generá una oferta para un finalista con{" "}
                <span className="font-semibold text-text">Nueva oferta</span>.
              </>
            )
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius)] border border-border bg-surface shadow-[var(--shadow)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="py-2.5 pl-4 pr-3 text-xs font-semibold uppercase tracking-wide text-muted">
                  Candidato
                </th>
                <th className="hidden py-2.5 pr-3 text-xs font-semibold uppercase tracking-wide text-muted sm:table-cell">
                  Puesto
                </th>
                <th className="hidden py-2.5 pr-3 text-xs font-semibold uppercase tracking-wide text-muted md:table-cell">
                  Salario
                </th>
                <th className="py-2.5 pr-3 text-xs font-semibold uppercase tracking-wide text-muted">
                  Estado
                </th>
                <th className="py-2.5 pr-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {offers.map((offer) => {
                const nexts = OFFER_TRANSITIONS[offer.status];
                const editable = isOfferEditable(offer.status);
                return (
                  <tr key={offer.id} className="transition-colors hover:bg-bg">
                    <td className="py-2.5 pl-4 pr-3 font-semibold text-text">
                      {offer.candidateName}
                    </td>
                    <td className="hidden py-2.5 pr-3 text-muted sm:table-cell">{offer.title}</td>
                    <td className="hidden py-2.5 pr-3 text-muted tabular-nums md:table-cell">
                      {formatSalary(offer.salaryAmount, offer.salaryCurrency)}
                    </td>
                    <td className="py-2.5 pr-3">
                      <Badge variant={OFFER_STATUS_BADGE[offer.status]}>
                        {OFFER_STATUS_LABELS[offer.status]}
                      </Badge>
                    </td>
                    <td className="py-2.5 pr-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <a
                          href={`/jobs/${jobId}/ofertas/${offer.id}/imprimir`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg px-2.5 py-1 text-xs font-semibold text-muted transition-colors hover:text-primary"
                        >
                          PDF
                        </a>
                        <Menu
                          align="end"
                          trigger={
                            <IconButton aria-label="Acciones de la oferta" size="sm" variant="ghost">
                              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
                                <circle cx="8" cy="3" r="1.4" />
                                <circle cx="8" cy="8" r="1.4" />
                                <circle cx="8" cy="13" r="1.4" />
                              </svg>
                            </IconButton>
                          }
                        >
                          {editable && (
                            <>
                              <MenuItem onClick={() => setEditing(offer.id)}>Editar…</MenuItem>
                              <MenuSeparator />
                            </>
                          )}
                          {nexts.length > 0 ? (
                            <>
                              <MenuLabel>Cambiar estado</MenuLabel>
                              {nexts.map((to) => (
                                <MenuItem
                                  key={to}
                                  destructive={to === "rejected"}
                                  onClick={() => onPickStatus(offer, to)}
                                >
                                  {to === "accepted" ? "Aceptar (contrata y cierra)" : OFFER_STATUS_LABELS[to]}
                                </MenuItem>
                              ))}
                            </>
                          ) : (
                            <MenuLabel>Sin acciones (terminal)</MenuLabel>
                          )}
                        </Menu>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <OfferDrawer
        jobId={jobId}
        jobTitle={jobTitle}
        applications={applications}
        editing={editing}
        onClose={() => setEditing(null)}
        onSaved={() => setEditing(null)}
      />

      {/* Confirm de aceptar: es irreversible (cierra la búsqueda y contrata). */}
      <Dialog
        open={confirmAccept !== null}
        onClose={() => setConfirmAccept(null)}
        side="center"
        title="¿Aceptar la oferta?"
        className="max-w-sm"
      >
        {confirmAccept && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted">
              Vas a contratar a{" "}
              <span className="font-semibold text-text">{confirmAccept.candidateName}</span> y{" "}
              <span className="font-semibold text-text">cerrar la búsqueda</span>. Esta acción no se
              puede deshacer.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmAccept(null)}
                className="text-sm font-semibold text-muted hover:text-text"
              >
                Cancelar
              </button>
              <Button
                onClick={() => {
                  const o = confirmAccept;
                  setConfirmAccept(null);
                  changeStatus(o, "accepted");
                }}
              >
                Aceptar y contratar
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
