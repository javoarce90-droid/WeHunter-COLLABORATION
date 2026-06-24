import { CandidateForm } from "@/features/recruiter/candidates/ui/CandidateForm";
import { cargarCandidatoAction } from "@/features/recruiter/candidates/actions";

export default function NewCandidatePage() {
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="font-display text-xl font-bold text-text">
          Cargar candidato
        </h1>
        <p className="text-sm text-muted">
          Sumá una persona al pool de tu workspace. El CV es opcional.
        </p>
      </div>
      <CandidateForm
        action={cargarCandidatoAction}
        submitLabel="Cargar candidato"
      />
    </div>
  );
}
