import { getCandidateProfile } from "@/lib/auth/session";
import { getPortalJobs } from "@/features/candidate/portal/data/portal.queries";
import { getMyInteractions } from "@/features/candidate/portal/data/interactions.queries";
import { getMyApplications } from "@/features/candidate/portal/data/applications.queries";
import { PortalView } from "@/features/candidate/portal/ui/PortalView";

export default async function PortalPage() {
  const [candidate, jobs, interactions, applications] = await Promise.all([
    getCandidateProfile(),
    getPortalJobs(),
    getMyInteractions(),
    getMyApplications(),
  ]);

  return (
    <PortalView
      initialJobs={jobs}
      initialFavorites={interactions.favoriteIds}
      initialHidden={interactions.hiddenIds}
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
