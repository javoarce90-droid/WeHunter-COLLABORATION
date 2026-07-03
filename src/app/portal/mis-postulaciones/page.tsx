import { getMyApplications } from "@/features/candidate/portal/data/applications.queries";
import { MisPostulacionesView } from "@/features/candidate/portal/ui/MisPostulacionesView";

export default async function MisPostulacionesPage() {
  const applications = await getMyApplications();
  return <MisPostulacionesView initialApplications={applications} />;
}
