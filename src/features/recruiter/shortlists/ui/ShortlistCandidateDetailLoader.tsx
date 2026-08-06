"use client";

import { type ReactNode, useEffect, useState, useTransition } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { getShortlistCandidateDetailAction } from "../actions";
import type { ShortlistCandidateDetailData } from "@/features/company/shortlist-review/domain/shortlist-candidate-detail";
import { ShortlistCandidateDetailSheet } from "@/features/company/shortlist-review/ui/ShortlistCandidateDetailSheet";

type Slots = {
  decisionSlot?: ReactNode;
  commentComposerSlot?: ReactNode;
  scheduleSlot?: ReactNode;
};

type Props = {
  shortlistCandidateId: string;
  jobTitle: string;
  onClose: () => void;
  /** Arma los slots de acción según quién mira (HM vs recruiter) una vez que llega el detalle. */
  buildSlots?: (data: ShortlistCandidateDetailData) => Slots;
};

/**
 * Pide la ficha completa recién al abrir (mismo patrón lazy que `PostuladoDetailSheet`) —
 * usado por la bandeja del Hiring Manager y por la vista del recruiter, que solo tenían la
 * lista liviana (`ShortlistCandidateWithFeedback`) precargada.
 *
 * El caller debe montarlo con `key={shortlistCandidateId}` y solo cuando hay selección (ver
 * `ShortlistCardCandidates`/`HmShortlistCandidateList`) — así cada apertura es un mount
 * fresco, sin resetear estado a mano dentro de un efecto (mismo truco que usa
 * `PostuladoDetailSheet` para evitar el cascading-render).
 */
export function ShortlistCandidateDetailLoader({
  shortlistCandidateId,
  jobTitle,
  onClose,
  buildSlots,
}: Props) {
  const [data, setData] = useState<ShortlistCandidateDetailData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startLoading] = useTransition();

  useEffect(() => {
    startLoading(async () => {
      const res = await getShortlistCandidateDetailAction(shortlistCandidateId);
      if (res.ok) setData(res.data);
      else setError(res.error);
    });
  }, [shortlistCandidateId, startLoading]);

  if (data) {
    return (
      <ShortlistCandidateDetailSheet
        data={data}
        jobTitle={jobTitle}
        onClose={onClose}
        {...(buildSlots ? buildSlots(data) : {})}
      />
    );
  }

  return (
    <Dialog open onClose={onClose} side="right" className="max-w-md" title="Candidato">
      <div className="flex items-center gap-2 py-8 text-sm text-muted">
        {error ? (
          <span className="text-danger">{error}</span>
        ) : (
          <>
            <Spinner /> Cargando candidato…
          </>
        )}
      </div>
    </Dialog>
  );
}
