import Link from "next/link";
import type { Candidate } from "@/db/schema";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export function CandidatesList({ candidates }: { candidates: Candidate[] }) {
  if (candidates.length === 0) {
    return (
      <Card>
        <div className="p-8 text-center text-sm text-muted">
          Todavía no tenés candidatos en el pool. Cargá el primero para empezar a
          armar tus búsquedas.
        </div>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {candidates.map((candidate) => (
        <Card key={candidate.id}>
          <div className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Link
                  href={`/candidates/${candidate.id}`}
                  className="truncate font-semibold text-text transition-colors hover:text-primary"
                >
                  {candidate.fullName}
                </Link>
                {candidate.cvUrl && <Badge variant="blue">CV</Badge>}
              </div>
              {candidate.email && (
                <p className="mt-1 truncate text-sm text-muted">
                  {candidate.email}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {candidate.cvUrl && (
                <a
                  href={`/candidates/${candidate.id}/cv`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-[var(--radius)] border border-border px-2.5 py-1 text-xs font-semibold text-muted transition-colors hover:border-primary hover:text-primary"
                >
                  Ver CV
                </a>
              )}
              <Link
                href={`/candidates/${candidate.id}/edit`}
                className="rounded-[var(--radius)] px-2.5 py-1 text-xs font-semibold text-muted transition-colors hover:text-primary"
              >
                Editar
              </Link>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
