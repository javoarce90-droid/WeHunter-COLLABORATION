import Link from "next/link";
import { notFound } from "next/navigation";
import { getActiveMembership } from "@/lib/auth/session";
import { can } from "@/lib/auth/roles";
import { getCandidateById } from "@/features/recruiter/candidates/data/candidates.queries";
import { getCandidateResume } from "@/features/recruiter/candidates/data/resume.queries";
import { AiUpdateCandidateFlow } from "@/features/recruiter/candidates/ui/AiUpdateCandidateFlow";
import { normalizeIfUncapitalized } from "@/lib/text";

export default async function UpdateCandidateWithAiPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const membership = await getActiveMembership();
  if (!membership || !can(membership.role, "candidates.manage")) notFound();

  const [candidate, resume] = await Promise.all([
    getCandidateById(id, membership.organizationId),
    getCandidateResume(id),
  ]);
  if (!candidate) notFound();

  const fullName = normalizeIfUncapitalized(candidate.fullName);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div>
        <nav
          aria-label="Migas de pan"
          className="mb-3 flex items-center gap-1.5 text-sm text-muted"
        >
          <Link href="/candidates" className="hover:text-text">
            Candidatos
          </Link>
          <span aria-hidden>/</span>
          <Link href={`/candidates/${candidate.id}`} className="truncate hover:text-text">
            {fullName}
          </Link>
          <span aria-hidden>/</span>
          <span className="text-text">Actualizar con IA</span>
        </nav>
        <h1 className="font-display text-xl font-bold tracking-[-0.01em] text-text">
          Completar el perfil desde un CV
        </h1>
        <p className="text-sm text-muted">
          La IA lee el CV y rellena lo que falta del perfil de {fullName}. El archivo nuevo
          queda adjunto al candidato.
        </p>
      </div>

      <AiUpdateCandidateFlow candidate={candidate} resume={resume} />
    </div>
  );
}
