import { Suspense } from "react";
import { getCandidateProfile } from "@/lib/auth/session";
import { getPortalJobs } from "@/features/candidate/portal/data/portal.queries";
import { getMyApplications } from "@/features/candidate/portal/data/applications.queries";
import { PortalView } from "@/features/candidate/portal/ui/PortalView";
import { perfilListoParaPostular } from "@/features/candidate/applications/domain/perfil-minimo";
import {
  CandidateNotificationBellLoader,
  CandidateNotificationBellFallback,
} from "@/features/candidate/notifications/ui/CandidateNotificationBellLoader";

export default async function PortalPage() {
  const [candidate, jobs, applications] = await Promise.all([
    getCandidateProfile(),
    getPortalJobs(),
    getMyApplications(),
  ]);

  const profileGate = perfilListoParaPostular({
    fullName: candidate?.fullName ?? null,
    email: candidate?.email ?? null,
    phone: candidate?.phone ?? null,
    location: candidate?.location ?? null,
    cvUrl: candidate?.cvUrl ?? null,
  });

  return (
    <PortalView
      initialJobs={jobs}
      appliedJobIds={applications.map((a) => a.jobId)}
      profileGate={profileGate}
      candidate={{
        fullName: candidate?.fullName ?? "",
        email: candidate?.email ?? "",
        phone: candidate?.phone ?? "",
        location: candidate?.location ?? "",
        cvUrl: candidate?.cvUrl ?? null,
      }}
      notificationBell={
        <Suspense fallback={<CandidateNotificationBellFallback />}>
          <CandidateNotificationBellLoader />
        </Suspense>
      }
    />
  );
}
