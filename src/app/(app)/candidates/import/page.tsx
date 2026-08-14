import Link from "next/link";
import { ImportCandidatesForm } from "@/features/recruiter/candidates/ui/ImportCandidatesForm";

export default function ImportCandidatesPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <nav aria-label="Migas de pan" className="flex items-center gap-2 text-sm text-muted">
          <Link href="/candidates" className="hover:text-text">
            Candidatos
          </Link>
          <span aria-hidden>/</span>
          <span className="text-text">Importar</span>
        </nav>
        <h1 className="mt-1 font-display text-xl font-bold text-text">
          Importar candidatos desde archivo
        </h1>
        <p className="text-sm text-muted">
          Sumá tu base existente al pool en lote — sin cargar candidato por candidato.
        </p>
      </div>

      <div className="max-w-3xl">
        <ImportCandidatesForm />
      </div>
    </div>
  );
}
