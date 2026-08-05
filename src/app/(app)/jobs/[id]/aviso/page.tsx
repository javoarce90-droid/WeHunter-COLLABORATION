import { notFound } from "next/navigation";
import { getActiveMembership } from "@/lib/auth/session";
import { getJobById } from "@/features/recruiter/jobs/data/jobs.queries";
import { listCandidateIdsByJob } from "@/features/recruiter/applications/data/applications.queries";
import { listCandidates } from "@/features/recruiter/candidates/data/candidates.queries";
import { AvisoEditor } from "@/features/recruiter/jobs/ui/AvisoEditor";

/**
 * Tab Aviso: editor de contenido (objetivos/requisitos/responsabilidades/beneficios) con
 * vista previa en vivo — el resto de los campos de la búsqueda (jobArea/modalidad/salario/etc,
 * mostrados como pills de contexto) se siguen editando en "Editar búsqueda". El job ya está
 * validado por el layout (getJobById está cacheado: comparte transacción RLS).
 */
export default async function JobAvisoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const membership = await getActiveMembership();
  if (!membership) notFound();

  const [job, candidateIdsEnLaBusqueda, candidates] = await Promise.all([
    getJobById(id, membership.organizationId),
    listCandidateIdsByJob(id, membership.organizationId),
    listCandidates(membership.organizationId),
  ]);
  if (!job) notFound();

  // Para el alta contextual: el pool ofrece solo candidatos que NO están ya en esta búsqueda.
  const postuladosIds = new Set(candidateIdsEnLaBusqueda);
  const poolCandidates = candidates
    .filter((c) => !postuladosIds.has(c.id))
    .map((c) => ({ id: c.id, fullName: c.fullName, email: c.email }));

  return <AvisoEditor job={job} poolCandidates={poolCandidates} />;
}
