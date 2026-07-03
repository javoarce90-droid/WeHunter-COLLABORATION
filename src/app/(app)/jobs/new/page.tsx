import { JobCreationChoice } from "@/features/recruiter/jobs/ui/JobCreationChoice";

export default function NewJobChoicePage() {
  return (
    <div className="flex w-full flex-col gap-6">
      <div className="mx-auto w-full max-w-2xl">
        <h1 className="font-display text-xl font-bold text-text">Nueva búsqueda</h1>
        <p className="text-sm text-muted">
          Se crea como borrador. La publicás cuando esté lista.
        </p>
      </div>
      <JobCreationChoice />
    </div>
  );
}
