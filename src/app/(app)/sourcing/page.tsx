import { getActiveMembership } from "@/lib/auth/session";
import { listJobs } from "@/features/recruiter/jobs/data/jobs.queries";
import { SourcingView } from "@/features/recruiter/sourcing/ui/SourcingView";

export default async function SourcingPage() {
  const membership = await getActiveMembership();
  if (!membership) return <SourcingView jobs={[]} />;

  const jobs = await listJobs(membership.organizationId);
  const openJobs = jobs
    .filter((j) => j.status === "open")
    .map((j) => ({ id: j.id, title: j.title }));

  return <SourcingView jobs={openJobs} />;
}
