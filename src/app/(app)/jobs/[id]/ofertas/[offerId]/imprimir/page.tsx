import { notFound } from "next/navigation";
import { getActiveMembership } from "@/lib/auth/session";
import { getOfferDetail } from "@/features/recruiter/offers/data/offers.queries";
import { PrintButton } from "@/features/recruiter/offers/ui/PrintButton";

const dateFmt = new Intl.DateTimeFormat("es-AR", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

function fmtDate(d: string | null): string | null {
  if (!d) return null;
  return dateFmt.format(new Date(d + "T00:00:00"));
}

interface Props {
  params: Promise<{ id: string; offerId: string }>;
}

/** Vista de impresión de una oferta (→ PDF vía print del navegador). Carta limpia. */
export default async function OfferPrintPage({ params }: Props) {
  const { offerId } = await params;
  const membership = await getActiveMembership();
  if (!membership) notFound();

  const offer = await getOfferDetail(offerId, membership.organizationId);
  if (!offer) notFound();

  const salary =
    offer.salaryAmount != null
      ? `${offer.salaryCurrency ? offer.salaryCurrency + " " : ""}${offer.salaryAmount.toLocaleString("es-AR")}`
      : null;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between print-hide">
        <span className="text-sm text-muted">Vista previa de impresión</span>
        <PrintButton />
      </div>

      <article className="print-document rounded-[var(--radius)] border border-border bg-surface p-10 shadow-[var(--shadow)]">
        <header className="mb-8 border-b border-border pb-5">
          <p className="text-xs uppercase tracking-wide text-muted">Carta de oferta</p>
          <h1 className="mt-1 font-display text-2xl font-bold text-text">{offer.title}</h1>
          <p className="mt-1 text-sm text-muted">
            Para {offer.candidateName}
            {offer.candidateEmail ? ` · ${offer.candidateEmail}` : ""}
          </p>
        </header>

        <dl className="mb-8 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          {salary && (
            <Row label="Salario" value={salary} />
          )}
          {fmtDate(offer.startDate) && <Row label="Fecha de inicio" value={fmtDate(offer.startDate)!} />}
          {fmtDate(offer.validUntil) && <Row label="Válida hasta" value={fmtDate(offer.validUntil)!} />}
          {offer.benefits && <Row label="Beneficios" value={offer.benefits} />}
        </dl>

        {offer.body && (
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-text">{offer.body}</div>
        )}

        <footer className="mt-10 border-t border-border pt-5 text-xs text-muted">
          Emitida el {dateFmt.format(offer.createdAt)}.
        </footer>
      </article>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-0.5 text-text">{value}</dd>
    </div>
  );
}
