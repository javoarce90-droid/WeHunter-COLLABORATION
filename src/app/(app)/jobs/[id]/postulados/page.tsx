import { notFound } from "next/navigation";
import { getActiveMembership } from "@/lib/auth/session";
import { listPostulados } from "@/features/recruiter/applications/data/applications.queries";
import { getJobById } from "@/features/recruiter/jobs/data/jobs.queries";
import { PostuladosTable } from "@/features/recruiter/applications/ui/PostuladosTable";

interface Props {
  params: Promise<{ id: string }>;
}

/** Pestaña Postulados: inbox de triage de la búsqueda. El job ya está validado por el layout.
 *  getJobById está cacheado por request (database.md #1): pedirlo de nuevo acá para el título
 *  (necesario al armar el mensaje de rechazo) no agrega una transacción extra. */
export default async function PostuladosPage({ params }: Props) {
  const { id: jobId } = await params;
  const membership = await getActiveMembership();
  if (!membership) notFound();

  const [postulados, job] = await Promise.all([
    listPostulados(jobId, membership.organizationId),
    getJobById(jobId, membership.organizationId),
  ]);
  if (!job) notFound();

  return <PostuladosTable jobId={jobId} jobTitle={job.title} postulados={postulados} />;
}
