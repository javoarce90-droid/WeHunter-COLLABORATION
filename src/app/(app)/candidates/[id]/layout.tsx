import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getActiveMembership } from "@/lib/auth/session";
import { getCandidateById } from "@/features/recruiter/candidates/data/candidates.queries";
import { CandidateTabs } from "@/features/recruiter/candidates/ui/CandidateTabs";
import { CANDIDATE_SOURCE_LABELS } from "@/features/recruiter/candidates/ui/source-meta";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

/**
 * Shell de la ficha del candidato: cabecera única (breadcrumb + avatar + datos + acciones)
 * y pestañas. Garantiza que el candidato exista y pertenezca a la org; las pages hijas
 * confían en esa garantía (no vuelven a validar existencia).
 */
export default async function CandidateLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const membership = await getActiveMembership();
  if (!membership) notFound();

  const candidate = await getCandidateById(id, membership.organizationId);
  if (!candidate) notFound();

  // profileId seteado = persona con cuenta vinculada; null = cargado a mano (DATA_MODEL.md).
  const isLinked = candidate.profileId !== null;

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

      <CandidateTabs candidateId={candidate.id} />

      <div>{children}</div>
    </div>
  );
}
