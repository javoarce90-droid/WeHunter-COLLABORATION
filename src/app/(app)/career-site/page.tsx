import { notFound } from "next/navigation";
import { getActiveMembership, getCurrentUser } from "@/lib/auth/session";
import { getOrganization } from "@/features/recruiter/settings/data/settings.queries";
import { getCareerSiteCoverPublicUrl } from "@/features/recruiter/settings/data/settings.storage";
import { CareerSiteForm } from "@/features/recruiter/career-site/ui/CareerSiteForm";
import { CareerSitePreview } from "@/features/recruiter/career-site/ui/CareerSitePreview";
import { CareerSiteHeaderActions } from "@/features/recruiter/career-site/ui/CareerSiteHeaderActions";
import type { OrgRole } from "@/lib/auth/session";

export default async function CareerSitePage() {
  const [user, membership] = await Promise.all([getCurrentUser(), getActiveMembership()]);
  if (!user || !membership) notFound();

  const org = await getOrganization(membership.organizationId);
  if (!org) notFound();

  const coverUrl = org.careerSiteCoverUrl
    ? getCareerSiteCoverPublicUrl(org.careerSiteCoverUrl, org.updatedAt)
    : null;
  const role = membership.role as OrgRole;
  const canEdit = role === "owner" || role === "admin";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-xl font-bold text-text">Career Site</h1>
          <p className="text-sm text-muted">
            Tu micrositio de empleos: configuralo, mirá cómo queda y compartilo.
          </p>
        </div>
        <CareerSiteHeaderActions slug={org.slug} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        <div className="flex flex-col gap-4 rounded-[var(--radius)] border border-border bg-surface p-5 shadow-[var(--shadow)]">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-sm font-bold text-text">Identidad del micrositio</h2>
            <p className="text-xs text-muted">
              El Career Site está siempre publicado, con los mismos avisos de tus búsquedas
              abiertas — no se cargan dos veces.
            </p>
          </div>
          <CareerSiteForm org={org} coverUrl={coverUrl} canEdit={canEdit} />
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-bold text-text">Cómo se ve</h2>
          <CareerSitePreview slug={org.slug} version={org.updatedAt.getTime()} />
          <p className="text-xs leading-relaxed text-muted">
            Esta es la misma pantalla que ve el candidato — no es una maqueta aparte. &quot;Abrir
            Career Site&quot; te lleva a verla completa.
          </p>
        </div>
      </div>
    </div>
  );
}
