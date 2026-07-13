import Link from "next/link";
import { JobCreationChoice } from "@/features/recruiter/jobs/ui/JobCreationChoice";

export default function NewJobChoicePage() {
  return (
    <div className="flex w-full flex-col gap-6">
      <div className="mx-auto w-full max-w-2xl">
        <nav aria-label="Migas de pan" className="mb-3 flex items-center gap-1.5 text-sm text-muted">
          <Link href="/jobs" className="hover:text-text">
            Búsquedas
          </Link>
          <span aria-hidden>/</span>
          <span className="text-text">Nueva búsqueda</span>
        </nav>
        <h1 className="font-display text-xl font-bold text-text">Nueva búsqueda</h1>
        <p className="text-sm text-muted">
          Se crea como borrador. La publicás cuando esté lista.
        </p>
      </div>
      <JobCreationChoice />
    </div>
  );
}
