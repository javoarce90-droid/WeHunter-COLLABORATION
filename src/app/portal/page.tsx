import { getCandidateProfile } from "@/lib/auth/session";
import { getPortalJobs } from "@/features/candidate/portal/data/portal.queries";
import { getMyApplications } from "@/features/candidate/portal/data/applications.queries";
import { PortalView } from "@/features/candidate/portal/ui/PortalView";

export default async function PortalPage() {
  const [candidate, jobs, applications] = await Promise.all([
    getCandidateProfile(),
    getPortalJobs(),
    getMyApplications(),
  ]);

  return (
    <PortalView
      initialJobs={jobs}
      appliedJobIds={applications.map((a) => a.jobId)}
      candidate={{
        fullName: candidate?.fullName ?? "",
        email: candidate?.email ?? "",
        phone: candidate?.phone ?? "",
        linkedinUrl: candidate?.linkedinUrl ?? "",
        cvUrl: candidate?.cvUrl ?? null,
      }}
    />
  );
}
