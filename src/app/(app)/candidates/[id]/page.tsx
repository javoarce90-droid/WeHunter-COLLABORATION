import Link from "next/link";
import { notFound } from "next/navigation";
import { getActiveMembership } from "@/lib/auth/session";
import { getCandidateById } from "@/features/recruiter/candidates/data/candidates.queries";
import { listApplicationsByCandidate } from "@/features/recruiter/applications/data/applications.queries";
import { STAGE_LABELS } from "@/features/recruiter/applications/schema";
import { Badge } from "@/components/ui/badge";

const dateFmt = new Intl.DateTimeFormat("es-AR", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

/** Ficha del candidato: perfil + su participación en búsquedas. */
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
      <div className="flex flex-col gap-3">
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
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="font-display text-xl font-bold text-text">
              {candidate.fullName}
            </h1>
            <Badge variant={isLinked ? "primary" : "muted"}>
              {isLinked ? "Cuenta vinculada" : "Cargado a mano"}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {candidate.cvUrl && (
              <a
                href={`/candidates/${candidate.id}/cv`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-[var(--radius)] border border-border px-3 py-2 text-sm font-semibold text-muted transition-colors hover:border-primary hover:text-primary"
              >
                Ver CV
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

      {/* Participación en búsquedas */}
      <section className="rounded-[var(--radius)] border border-border bg-surface shadow-[var(--shadow)]">
        <div className="border-b border-border px-5 py-3.5">
          <h2 className="text-sm font-bold text-text">Búsquedas</h2>
        </div>
        {apps.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-muted">
            Este candidato todavía no participa en ninguna búsqueda. Postulalo desde
            el pipeline de una búsqueda.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {apps.map((app) => (
              <li key={app.id}>
                <Link
                  href={`/jobs/${app.jobId}/pipeline`}
                  className="group flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3.5 transition-colors hover:bg-bg"
                >
                  <span className="min-w-0 flex-1 truncate font-semibold text-text transition-colors group-hover:text-primary">
                    {app.jobTitle}
                  </span>
                  <Badge variant={app.stage}>{STAGE_LABELS[app.stage]}</Badge>
                  <span className="text-xs text-muted">
                    Agregado {dateFmt.format(app.createdAt)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
