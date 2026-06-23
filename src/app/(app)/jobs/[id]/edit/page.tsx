import { notFound } from "next/navigation";
import { getActiveMembership } from "@/lib/auth/session";
import { getJobById } from "@/features/recruiter/jobs/data/jobs.queries";
import { JobForm } from "@/features/recruiter/jobs/ui/JobForm";
import { editarBusquedaAction } from "@/features/recruiter/jobs/actions";

export default async function EditJobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const membership = await getActiveMembership();
  const job = membership ? await getJobById(id, membership.organizationId) : null;
  if (!job) notFound();

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="font-display text-xl font-bold text-text">Editar búsqueda</h1>
      <JobForm
        action={editarBusquedaAction}
        submitLabel="Guardar cambios"
        jobId={job.id}
        defaults={{ title: job.title, description: job.description }}
      />
    </div>
  );
}
