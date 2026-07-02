import Link from "next/link";
import { notFound } from "next/navigation";
import { getActiveMembership } from "@/lib/auth/session";
import { getCandidateById } from "@/features/recruiter/candidates/data/candidates.queries";
import { listApplicationsByCandidate } from "@/features/recruiter/applications/data/applications.queries";
import { STAGE_LABELS } from "@/features/recruiter/applications/schema";
import { Badge } from "@/components/ui/badge";
import { AiScore } from "@/components/ui/ai";
import { EmptyState } from "@/components/ui/empty-state";
import { normalizeIfUncapitalized } from "@/lib/text";

const dateFmt = new Intl.DateTimeFormat("es-AR", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

/**
 * Pestaña Perfil: facts + CV + resumen + participación en búsquedas. La cabecera
 * (breadcrumb, avatar, acciones) la pone el layout de la ficha.
 */
export default async function CandidateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const membership = await getActiveMembership();
  if (!membership) notFound();

  const [candidate, apps] = await Promise.all([
    getCandidateById(id, membership.organizationId),
    listApplicationsByCandidate(id, membership.organizationId),
  ]);
  if (!candidate) notFound();

  const facts: { label: string; value: string }[] = [
    { label: "Email", value: candidate.email || "—" },
    { label: "Búsquedas", value: String(apps.length) },
    { label: "En el pool desde", value: dateFmt.format(candidate.createdAt) },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* Datos clave */}
      <dl className="grid grid-cols-1 gap-px overflow-hidden rounded-[var(--radius)] border border-border bg-border sm:grid-cols-3">
        {facts.map((f) => (
          <div key={f.label} className="bg-surface px-4 py-3">
            <dt className="text-xs font-medium text-muted">{f.label}</dt>
            <dd className="mt-0.5 truncate font-semibold text-text">{f.value}</dd>
          </div>
        ))}
      </dl>

      {/* Cuerpo: participación (aside) + CV (principal) */}
      <div className="grid gap-5 lg:grid-cols-3">
        {/* CV — preview embebido. Principal en desktop, debajo en mobile. */}
        <section
          className={[
            "order-2 lg:order-1 lg:col-span-2",
            candidate.cvUrl ? "" : "self-start",
          ].join(" ")}
        >
          <div className="flex h-full flex-col overflow-hidden rounded-[var(--radius)] border border-border bg-surface shadow-[var(--shadow)]">
            <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
              <h2 className="text-sm font-bold text-text">CV</h2>
              {candidate.cvUrl && (
                <a
                  href={`/candidates/${candidate.id}/cv`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold text-primary hover:text-primary-hover"
                >
                  Abrir en pestaña nueva →
                </a>
              )}
            </div>
            {candidate.cvUrl ? (
              <iframe
                src={`/candidates/${candidate.id}/cv`}
                title={`CV de ${candidate.fullName}`}
                className="h-[640px] w-full bg-bg"
              />
            ) : (
              <EmptyState
                icon={<DocumentIcon />}
                title="Este candidato no tiene CV cargado."
                action={{ label: "Subir CV", href: `/candidates/${candidate.id}/edit` }}
                variant="plain"
                className="py-10"
              />
            )}
          </div>
        </section>

        {/* Perfil + participación en búsquedas */}
        <aside className="order-1 flex flex-col gap-5 lg:order-2">
          {(candidate.summary || (candidate.skills?.length ?? 0) > 0) && (
            <section className="rounded-[var(--radius)] border border-border bg-surface p-5 shadow-[var(--shadow)]">
              <h2 className="mb-2 text-sm font-bold text-text">Perfil</h2>
              {candidate.summary && (
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-text/80">
                  {candidate.summary}
                </p>
              )}
              {(candidate.skills?.length ?? 0) > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {candidate.skills!.map((s) => (
                    <span
                      key={s}
                      className="rounded-full bg-primary-light px-2.5 py-0.5 text-xs font-semibold text-primary-hover"
                    >
                      {normalizeIfUncapitalized(s)}
                    </span>
                  ))}
                </div>
              )}
            </section>
          )}

          <section className="rounded-[var(--radius)] border border-border bg-surface shadow-[var(--shadow)]">
            <div className="border-b border-border px-5 py-3.5">
              <h2 className="text-sm font-bold text-text">Búsquedas</h2>
            </div>
            {apps.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-muted">
                Todavía no participa en ninguna búsqueda. Postulalo desde el pipeline de
                una búsqueda.
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {apps.map((app) => (
                  <li key={app.id}>
                    <Link
                      href={`/jobs/${app.jobId}/pipeline`}
                      className="group flex flex-col gap-1 px-5 py-3.5 transition-colors hover:bg-bg"
                    >
                      <span className="truncate font-semibold text-text transition-colors group-hover:text-primary">
                        {app.jobTitle}
                      </span>
                      <span className="flex items-center gap-2">
                        <Badge variant={app.stage}>{STAGE_LABELS[app.stage]}</Badge>
                        <span className="text-xs text-muted">
                          {dateFmt.format(app.createdAt)}
                        </span>
                      </span>
                      {app.aiScore != null && (
                        <span className="mt-1 flex items-start gap-1.5">
                          <AiScore score={app.aiScore} size={20} />
                          {app.aiSummary && (
                            <span className="text-xs text-muted">{app.aiSummary}</span>
                          )}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

function DocumentIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
    </svg>
  );
}
