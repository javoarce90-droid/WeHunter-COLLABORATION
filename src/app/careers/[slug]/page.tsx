import { notFound } from "next/navigation";
import {
  getCareerSite,
  getActiveCareerSitesElsewhere,
  isViewerMemberOfOrg,
} from "@/features/candidate/career-site/data/career-site.data";
import { PublicJobList } from "@/features/candidate/career-site/ui/PublicJobList";

export const dynamic = "force-dynamic";

export default async function CareerSitePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string }>;
}) {
  const { slug } = await params;
  const { preview } = await searchParams;
  const careerSite = await getCareerSite(slug);
  if (!careerSite) notFound();

  // No sugerir búsquedas de OTRAS orgs cuando quien mira es un miembro de ESTA org — sea que
  // llegue por el iframe de preview de Settings (?preview=1, forma más barata: no necesita
  // pegarle a la base) o navegando directo a la URL pública ya logueado. Feedback QA ago 2026.
  const isOwnOrgViewer =
    preview === "1" || (careerSite.jobs.length === 0 && (await isViewerMemberOfOrg(careerSite.organizationId)));

  // Solo se pide cuando hace falta (empty state, y nunca para el dueño de la org) — el caso
  // normal, con búsquedas, no paga esto.
  const otherCareerSites = !isOwnOrgViewer && careerSite.jobs.length === 0
    ? await getActiveCareerSitesElsewhere(careerSite.organizationId)
    : [];

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-display text-lg font-bold text-text">Búsquedas abiertas</h2>
      <PublicJobList slug={slug} jobs={careerSite.jobs} otherCareerSites={otherCareerSites} />
    </div>
  );
}
