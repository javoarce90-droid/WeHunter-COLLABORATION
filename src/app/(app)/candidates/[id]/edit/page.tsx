import Link from "next/link";
import { notFound } from "next/navigation";
import { getActiveMembership } from "@/lib/auth/session";
import { getCandidateById } from "@/features/recruiter/candidates/data/candidates.queries";
import { getCandidateResume } from "@/features/recruiter/candidates/data/resume.queries";
import { CandidateForm } from "@/features/recruiter/candidates/ui/CandidateForm";
import { editarCandidatoAction } from "@/features/recruiter/candidates/actions";
import { normalizeIfUncapitalized } from "@/lib/text";

export default async function EditCandidatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const membership = await getActiveMembership();
  if (!membership) notFound();

  const [candidate, resume] = await Promise.all([
    getCandidateById(id, membership.organizationId),
    getCandidateResume(id),
  ]);
  if (!candidate) notFound();

  const fullName = normalizeIfUncapitalized(candidate.fullName);

  return (
    <div className="mx-auto w-full max-w-6xl flex flex-col gap-6">
      <div>
        <nav aria-label="Migas de pan" className="mb-3 flex items-center gap-1.5 text-sm text-muted">
          <Link href="/candidates" className="hover:text-text">
            Candidatos
          </Link>
          <span aria-hidden>/</span>
          <Link href={`/candidates/${candidate.id}`} className="truncate hover:text-text">
            {fullName}
          </Link>
          <span aria-hidden>/</span>
          <span className="text-text">Editar</span>
        </nav>
        <h1 className="font-display text-xl font-bold text-text">
          Editar candidato
        </h1>
      </div>
      <CandidateForm
        action={editarCandidatoAction}
        submitLabel="Guardar cambios"
        candidateId={candidate.id}
        cancelHref={`/candidates/${candidate.id}`}
        defaults={{
          fullName: candidate.fullName,
          email: candidate.email,
          phone: candidate.phone,
          hasCv: Boolean(candidate.cvUrl),
          headline: candidate.headline,
          location: candidate.location,
          linkedinUrl: candidate.linkedinUrl,
          summary: candidate.summary,
          skills: candidate.skills,
          source: candidate.source,
          initialResume: resume,
        }}
      />
    </div>
  );
}
