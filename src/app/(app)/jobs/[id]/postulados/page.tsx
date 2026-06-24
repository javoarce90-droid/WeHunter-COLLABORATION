import { notFound } from "next/navigation";
import { getActiveMembership } from "@/lib/auth/session";
import { listPostulados } from "@/features/recruiter/applications/data/applications.queries";
import { PostuladosTable } from "@/features/recruiter/applications/ui/PostuladosTable";

interface Props {
  params: Promise<{ id: string }>;
}

/** Pestaña Postulados: inbox de triage de la búsqueda. El job ya está validado por el layout. */
export default async function PostuladosPage({ params }: Props) {
  const { id: jobId } = await params;
  const membership = await getActiveMembership();
  if (!membership) notFound();

  const postulados = await listPostulados(jobId, membership.organizationId);

  return <PostuladosTable jobId={jobId} postulados={postulados} />;
}
