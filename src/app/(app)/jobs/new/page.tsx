import { JobForm } from "@/features/recruiter/jobs/ui/JobForm";
import { crearBusquedaAction } from "@/features/recruiter/jobs/actions";

export default function NewJobPage() {
  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="font-display text-xl font-bold text-text">Nueva búsqueda</h1>
        <p className="text-sm text-muted">
          Se crea como borrador. La publicás cuando esté lista.
        </p>
      </div>
      <JobForm action={crearBusquedaAction} submitLabel="Crear búsqueda" />
    </div>
  );
}
