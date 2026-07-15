import { Suspense } from "react";
import { getMyApplications } from "@/features/candidate/portal/data/applications.queries";
import { MisPostulacionesView } from "@/features/candidate/portal/ui/MisPostulacionesView";
import {
  CandidateNotificationBellLoader,
  CandidateNotificationBellFallback,
} from "@/features/candidate/notifications/ui/CandidateNotificationBellLoader";

export default async function MisPostulacionesPage() {
  const applications = await getMyApplications();
  return (
    <MisPostulacionesView
      initialApplications={applications}
      notificationBell={
        <Suspense fallback={<CandidateNotificationBellFallback />}>
          <CandidateNotificationBellLoader />
        </Suspense>
      }
    />
  );
}
