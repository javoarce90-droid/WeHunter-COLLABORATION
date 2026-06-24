import { notFound } from "next/navigation";
import { getActiveMembership } from "@/lib/auth/session";
import { getJobById } from "@/features/recruiter/jobs/data/jobs.queries";
import { listOffersByJob } from "@/features/recruiter/offers/data/offers.queries";
import { listApplicationsByJob } from "@/features/recruiter/applications/data/applications.queries";
import { OffersTab } from "@/features/recruiter/offers/ui/OffersTab";

interface Props {
  params: Promise<{ id: string }>;
}

/** Pestaña Ofertas. El job ya está validado por el layout; getJobById está cacheado. */
export default async function OfertasPage({ params }: Props) {
  const { id: jobId } = await params;
  const membership = await getActiveMembership();
  if (!membership) notFound();

  const [job, offers, apps] = await Promise.all([
    getJobById(jobId, membership.organizationId),
    listOffersByJob(jobId, membership.organizationId),
    listApplicationsByJob(jobId, membership.organizationId),
  ]);
  if (!job) notFound();

  // Candidatos ofertables: cualquiera del pipeline que no esté descartado.
  const applications = apps
    .filter((a) => a.stage !== "rejected")
    .map((a) => ({ applicationId: a.id, candidateName: a.candidate.fullName }));

  return (
    <OffersTab
      jobId={jobId}
      jobTitle={job.title}
      offers={offers}
      applications={applications}
    />
  );
}
