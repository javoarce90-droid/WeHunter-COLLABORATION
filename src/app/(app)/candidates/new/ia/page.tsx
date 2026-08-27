import { notFound } from "next/navigation";
import Link from "next/link";
import { getActiveMembership } from "@/lib/auth/session";
import { can } from "@/lib/auth/roles";
import { AiCandidateFlow } from "@/features/recruiter/candidates/ui/AiCandidateFlow";

export default async function NewCandidateWithAiPage() {
  const membership = await getActiveMembership();
  if (!membership || !can(membership.role, "candidates.manage")) notFound();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div>
        <nav aria-label="Migas de pan" className="mb-3 flex items-center gap-1.5 text-sm text-muted">
          <Link href="/candidates" className="hover:text-text">
            Candidatos
          </Link>
          <span aria-hidden>/</span>
          <span className="text-text">Crear con IA</span>
        </nav>
        <h1 className="font-display text-xl font-bold tracking-[-0.01em] text-text">
          Crear candidato desde el CV
        </h1>
        <p className="text-sm text-muted">
          La IA lee el CV y arma el perfil. El archivo queda adjunto al candidato.
        </p>
      </div>

      <AiCandidateFlow />
    </div>
  );
}
