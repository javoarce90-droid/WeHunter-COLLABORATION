import { notFound } from "next/navigation";
import { getActiveMembership } from "@/lib/auth/session";
import { getJobById } from "@/features/recruiter/jobs/data/jobs.queries";
import { listClientsForSelect } from "@/features/recruiter/clients/data/clients.queries";
import { JobForm } from "@/features/recruiter/jobs/ui/JobForm";
import { editarBusquedaAction } from "@/features/recruiter/jobs/actions";

export default async function EditJobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const membership = await getActiveMembership();
  if (!membership) notFound();

  const [job, clients] = await Promise.all([
    getJobById(id, membership.organizationId),
    listClientsForSelect(membership.organizationId),
  ]);
  if (!job) notFound();

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <JobForm
        action={editarBusquedaAction}
        submitLabel="Guardar cambios"
        jobId={job.id}
        clients={clients}
        defaults={{
          title: job.title,
          description: job.description,
          posting: job.posting,
          clientId: job.clientId,
          location: job.location,
          modality: job.modality,
          seniority: job.seniority,
          employmentType: job.employmentType,
          priority: job.priority,
          salaryMin: job.salaryMin,
          salaryMax: job.salaryMax,
          salaryCurrency: job.salaryCurrency,
          skills: job.skills,
          deadline: job.deadline,
        }}
      />
    </div>
  );
}
