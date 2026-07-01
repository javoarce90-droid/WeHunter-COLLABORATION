import { notFound } from "next/navigation";
import { getCareerSite } from "@/features/candidate/career-site/data/career-site.data";
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

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-display text-lg font-bold text-text">Búsquedas abiertas</h2>
      <PublicJobList slug={slug} jobs={careerSite.jobs} />
    </div>
  );
}
