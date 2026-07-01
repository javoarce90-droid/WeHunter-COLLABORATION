import Link from "next/link";
import { notFound } from "next/navigation";
import { getActiveMembership } from "@/lib/auth/session";
import { getCandidateById } from "@/features/recruiter/candidates/data/candidates.queries";
import { listApplicationsByCandidate } from "@/features/recruiter/applications/data/applications.queries";
import { STAGE_LABELS } from "@/features/recruiter/applications/schema";
import { CANDIDATE_SOURCE_LABELS } from "@/features/recruiter/candidates/ui/source-meta";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { AiScore } from "@/components/ui/ai";

const dateFmt = new Intl.DateTimeFormat("es-AR", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

/** Ficha del candidato: perfil + CV + su participación en búsquedas. */
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

  // profileId seteado = persona con cuenta vinculada; null = cargado a mano (DATA_MODEL.md).
  const isLinked = candidate.profileId !== null;

  const facts: { label: string; value: string }[] = [
    { label: "Email", value: candidate.email || "—" },
    { label: "Búsquedas", value: String(apps.length) },
    { label: "En el pool desde", value: dateFmt.format(candidate.createdAt) },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* Cabecera */}
      <div className="flex flex-col gap-4">
        <nav
          aria-label="Migas de pan"
          className="flex items-center gap-1.5 text-sm text-muted"
        >
          <Link href="/candidates" className="hover:text-text">
            Candidatos
          </Link>
          <span aria-hidden>/</span>
          <span className="truncate text-text">{candidate.fullName}</span>
        </nav>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar name={candidate.fullName} size="lg" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                <h1 className="font-display text-xl font-bold text-text">
                  {candidate.fullName}
                </h1>
                <Badge variant={isLinked ? "primary" : "muted"}>
                  {isLinked ? "Cuenta vinculada" : "Cargado a mano"}
                </Badge>
              </div>
              {candidate.headline && (
                <p className="mt-0.5 truncate text-sm font-medium text-text">
                  {candidate.headline}
                </p>
              )}
              <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted">
                {candidate.location && <span>{candidate.location}</span>}
                {candidate.source && (
                  <>
                    {candidate.location && <span aria-hidden>·</span>}
                    <span>{CANDIDATE_SOURCE_LABELS[candidate.source]}</span>
                  </>
                )}
                {candidate.linkedinUrl && (
                  <>
                    {(candidate.location || candidate.source) && <span aria-hidden>·</span>}
                    <a
                      href={candidate.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-primary hover:text-primary-hover"
                    >
                      LinkedIn
                    </a>
                  </>
                )}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {candidate.cvUrl && (
              <a
                href={`/candidates/${candidate.id}/cv`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-[var(--radius)] border border-border px-3 py-2 text-sm font-semibold text-muted transition-colors hover:border-primary hover:text-primary"
              >
                Abrir CV
              </a>
            )}
            <Link
              href={`/candidates/${candidate.id}/edit`}
              className="inline-flex items-center justify-center rounded-[var(--radius)] border border-border px-3 py-2 text-sm font-semibold text-muted transition-colors hover:border-primary hover:text-primary"
            >
              Editar
            </Link>
          </div>
        </div>
      </div>

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
        <section className="order-2 lg:order-1 lg:col-span-2">
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
              <div className="px-5 py-16 text-center">
                <p className="text-sm text-muted">
                  Este candidato no tiene CV cargado.
                </p>
                <Link
                  href={`/candidates/${candidate.id}/edit`}
                  className="mt-3 inline-block text-sm font-semibold text-primary hover:text-primary-hover"
                >
                  Subir CV
                </Link>
              </div>
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
                      {s}
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
