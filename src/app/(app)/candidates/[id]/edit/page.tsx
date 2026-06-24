import { notFound } from "next/navigation";
import { getActiveMembership } from "@/lib/auth/session";
import { getCandidateById } from "@/features/recruiter/candidates/data/candidates.queries";
import { CandidateForm } from "@/features/recruiter/candidates/ui/CandidateForm";
import { editarCandidatoAction } from "@/features/recruiter/candidates/actions";

export default async function EditCandidatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const membership = await getActiveMembership();
  const candidate = membership
    ? await getCandidateById(id, membership.organizationId)
    : null;
  if (!candidate) notFound();

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <h1 className="font-display text-xl font-bold text-text">
        Editar candidato
      </h1>
      <CandidateForm
        action={editarCandidatoAction}
        submitLabel="Guardar cambios"
        candidateId={candidate.id}
        defaults={{
          fullName: candidate.fullName,
          email: candidate.email,
          hasCv: Boolean(candidate.cvUrl),
          headline: candidate.headline,
          location: candidate.location,
          linkedinUrl: candidate.linkedinUrl,
          summary: candidate.summary,
          skills: candidate.skills,
          source: candidate.source,
        }}
      />
    </div>
  );
}
