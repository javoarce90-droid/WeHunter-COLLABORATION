import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/ui/empty-state";
import { getActiveMembership } from "@/lib/auth/session";
import { can } from "@/lib/auth/roles";
import { listShortlistsSharedWithMembership } from "@/features/recruiter/shortlists/data/shortlists.queries";

const dateFormatter = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "short", year: "numeric" });

/** Vista propia del Hiring Manager: shortlists que un recruiter compartió con él (§9). Solo
 *  lectura acá — el detalle es donde deja feedback. */
export default async function SharedShortlistsPage() {
  const membership = await getActiveMembership();
  if (!membership || !can(membership.role, "shortlists.feedback")) notFound();

  const shared = await listShortlistsSharedWithMembership(membership.id, membership.organizationId);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-display text-xl font-bold text-text">Shortlists compartidas</h1>
        <p className="mt-0.5 max-w-[70ch] text-sm text-muted">
          Selecciones de candidatos que el equipo de reclutamiento compartió con vos. Entrá a
          cada una para dejar tu feedback.
        </p>
      </div>

      {shared.length === 0 ? (
        <EmptyState
          title="Todavía no te compartieron ninguna shortlist"
          description="Cuando el equipo de reclutamiento arme una selección de candidatos para tu búsqueda, la vas a ver acá."
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {shared.map((s) => (
            <li key={s.shortlistId}>
              <Link
                href={`/shortlists/${s.shortlistId}`}
                className="group flex items-center justify-between gap-3 rounded-[var(--radius)] border border-border bg-surface px-4 py-3 shadow-[var(--shadow)] transition-colors hover:bg-bg"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-text transition-colors group-hover:text-primary">
                    {s.shortlistName}
                  </p>
                  <p className="truncate text-xs text-muted">{s.jobTitle}</p>
                </div>
                <span className="shrink-0 text-xs text-muted">
                  Compartida el {dateFormatter.format(s.sharedAt)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
