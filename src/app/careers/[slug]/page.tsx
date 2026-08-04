import { notFound } from "next/navigation";
import {
  getCareerSite,
  getActiveCareerSitesElsewhere,
} from "@/features/candidate/career-site/data/career-site.data";
import { PublicJobList } from "@/features/candidate/career-site/ui/PublicJobList";

export const dynamic = "force-dynamic";

export default async function CareerSitePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const careerSite = await getCareerSite(slug);
  if (!careerSite) notFound();

  // Solo se pide cuando hace falta (empty state) — el caso normal, con búsquedas, no paga esto.
  const otherCareerSites = careerSite.jobs.length === 0
    ? await getActiveCareerSitesElsewhere(careerSite.organizationId)
    : [];

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-display text-lg font-bold text-text">Búsquedas abiertas</h2>
      <PublicJobList slug={slug} jobs={careerSite.jobs} otherCareerSites={otherCareerSites} />
    </div>
  );
}
