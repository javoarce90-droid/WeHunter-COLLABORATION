import { notFound } from "next/navigation";
import { getActiveMembership, getCurrentUser } from "@/lib/auth/session";
import { getJobById } from "@/features/recruiter/jobs/data/jobs.queries";
import { listOffersByJob } from "@/features/recruiter/offers/data/offers.queries";
import { listApplicationOptionsByJob } from "@/features/recruiter/applications/data/applications.queries";
import { OffersTab } from "@/features/recruiter/offers/ui/OffersTab";
import { getConnectionByProfile } from "@/features/recruiter/google-calendar/data/connections.queries";
import { hasGmailSendScope } from "@/features/recruiter/google-calendar/data/oauth-client";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ applicationId?: string }>;
}

/** Pestaña Ofertas. El job ya está validado por el layout; getJobById está cacheado. */
export default async function OfertasPage({ params, searchParams }: Props) {
  const { id: jobId } = await params;
  const { applicationId } = await searchParams;
  const [user, membership] = await Promise.all([getCurrentUser(), getActiveMembership()]);
  if (!user || !membership) notFound();

  const [job, offers, apps, googleConnection] = await Promise.all([
    getJobById(jobId, membership.organizationId),
    listOffersByJob(jobId, membership.organizationId),
    listApplicationOptionsByJob(jobId, membership.organizationId),
    getConnectionByProfile(user.id, membership.organizationId),
  ]);
  if (!job) notFound();

  // Candidatos ofertables: cualquiera del pipeline que no esté descartado.
  const applications = apps
    .filter((a) => a.stage !== "rejected")
    .map((a) => ({ applicationId: a.id, candidateName: a.candidateFullName }));

  // Solo precargamos si el ?applicationId llegado (ej. desde el menú del pipeline) es ofertable.
  const initialApplicationId = applications.some((a) => a.applicationId === applicationId)
    ? applicationId
    : undefined;

  return (
    <OffersTab
      jobId={jobId}
      jobTitle={job.title}
      offers={offers}
      applications={applications}
      initialApplicationId={initialApplicationId}
      canSendEmail={hasGmailSendScope(googleConnection)}
    />
  );
}
