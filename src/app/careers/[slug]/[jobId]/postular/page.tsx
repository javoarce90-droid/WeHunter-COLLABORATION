import Link from "next/link";
import { notFound } from "next/navigation";
import { getCandidateProfile, getCurrentUser } from "@/lib/auth/session";
import { getCareerSiteJob } from "@/features/candidate/career-site/data/career-site.data";
import { accentStyle } from "@/features/candidate/career-site/ui/brand";
import { ApplyForm } from "@/features/candidate/applications/ui/ApplyForm";
import { perfilListoParaPostular } from "@/features/candidate/applications/domain/perfil-minimo";

export const dynamic = "force-dynamic";

export default async function CareerSiteApplyPage({
  params,
}: {
  params: Promise<{ slug: string; jobId: string }>;
}) {
  const { slug, jobId } = await params;
  const result = await getCareerSiteJob(slug, jobId);
  if (!result) notFound();

  const user = await getCurrentUser();
  const accent = result.organization.settings?.accentColor;

  // Visitante sin cuenta: se postula igual — carga sus datos y CV en el form y entra como
  // candidato de la org. El registro se le ofrece después de enviar.
  if (!user) {
    return (
      <ApplyForm
        mode="anon"
        slug={slug}
        job={result.job}
        defaultName=""
        defaultEmail=""
        accentColor={accent}
      />
    );
  }

  const defaultName =
    typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : "";
  const candidate = await getCandidateProfile();

  const perfil = perfilListoParaPostular({
    fullName: candidate?.fullName ?? null,
    email: candidate?.email ?? user.email ?? null,
    phone: candidate?.phone ?? null,
    location: candidate?.location ?? null,
    cvUrl: candidate?.cvUrl ?? null,
  });
  if (!perfil.ok) {
    const redirectTarget = `/careers/${slug}/${jobId}/postular`;
    return (
      <div className="rounded-[var(--radius)] border border-border bg-surface p-6 text-center shadow-[var(--shadow)]">
        <p className="text-sm text-text">
          Antes de postularte necesitamos completar algunos datos básicos de tu perfil para que
          los recruiters puedan evaluar tu candidatura.
        </p>
        <p className="mt-2 text-xs text-muted">Falta cargar: {perfil.faltantes.join(", ")}.</p>
        <div className="mt-4 flex justify-center">
          <Link
            href={`/c/profile?redirect=${encodeURIComponent(redirectTarget)}`}
            style={{ color: "var(--primary-contrast, #fff)", ...accentStyle(accent) }}
            className="inline-flex items-center justify-center rounded-[var(--radius)] bg-primary px-4 py-3 text-sm font-semibold transition-[filter] hover:brightness-95"
          >
            Completar perfil
          </Link>
        </div>
      </div>
    );
  }

  return (
    <ApplyForm
      slug={slug}
      job={result.job}
      defaultName={defaultName}
      defaultEmail={user.email ?? ""}
      defaultPhone={candidate?.phone ?? undefined}
      existingCvUrl={candidate?.cvUrl}
      accentColor={accent}
    />
  );
}
