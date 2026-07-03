import { JobAiCreateForm } from "@/features/recruiter/jobs/ui/JobAiCreateForm";
import { crearBusquedaConIaAction } from "@/features/recruiter/jobs/actions";

export default function NewJobAiPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div>
        <h1 className="font-display text-xl font-bold text-text">Nueva búsqueda con IA</h1>
        <p className="text-sm text-muted">
          Se crea como borrador. La publicás cuando esté lista.
        </p>
      </div>
      <JobAiCreateForm action={crearBusquedaConIaAction} />
    </div>
  );
}
