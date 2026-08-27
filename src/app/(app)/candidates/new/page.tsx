import Link from "next/link";
import { CandidateForm } from "@/features/recruiter/candidates/ui/CandidateForm";
import { cargarCandidatoAction } from "@/features/recruiter/candidates/actions";
import { SparkleIcon } from "@/components/ui/ai";

export default function NewCandidatePage() {
  return (
    <div className="mx-auto w-full max-w-6xl flex flex-col gap-6">
      <div>
        <nav aria-label="Migas de pan" className="mb-3 flex items-center gap-1.5 text-sm text-muted">
          <Link href="/candidates" className="hover:text-text">
            Candidatos
          </Link>
          <span aria-hidden>/</span>
          <span className="text-text">Nuevo candidato</span>
        </nav>
        <h1 className="font-display text-xl font-bold text-text">
          Cargar candidato
        </h1>
        <p className="text-sm text-muted">
          Sumá una persona al pool de tu workspace. El CV es opcional.
        </p>
        <Link
          href="/candidates/new/ia"
          className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-primary transition-colors hover:text-primary-hover"
        >
          <SparkleIcon size={13} />
          ¿Tenés el CV? Crealo con IA
        </Link>
      </div>
      <CandidateForm
        action={cargarCandidatoAction}
        submitLabel="Cargar candidato"
      />
    </div>
  );
}
