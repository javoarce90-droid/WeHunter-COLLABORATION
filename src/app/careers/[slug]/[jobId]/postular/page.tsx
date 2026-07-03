import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getCareerSiteJob } from "@/features/candidate/career-site/data/career-site.data";
import { accentStyle } from "@/features/candidate/career-site/ui/brand";
import { ApplyForm } from "@/features/candidate/applications/ui/ApplyForm";

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
  const redirectTarget = `/careers/${slug}/${jobId}/postular`;

  if (!user) {
    return (
      <div className="rounded-[var(--radius)] border border-border bg-surface p-6 text-center shadow-[var(--shadow)]">
        <p className="text-sm text-text">
          Para postularte a <strong>{result.job.title}</strong> necesitás una cuenta.
        </p>
        <div className="mt-4 flex justify-center gap-3">
          <Link
            href={`/c/login?redirect=${encodeURIComponent(redirectTarget)}`}
            className="rounded-[var(--radius)] border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-text transition-colors hover:bg-bg"
          >
            Ingresar
          </Link>
          <Link
            href={`/c/register?redirect=${encodeURIComponent(redirectTarget)}`}
            style={accentStyle(result.organization.settings?.accentColor)}
            className="inline-flex items-center justify-center rounded-[var(--radius)] bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-[filter] hover:brightness-90"
          >
            Crear cuenta
          </Link>
        </div>
      </div>
    );
  }

  const defaultName =
    typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : "";

  return (
    <ApplyForm
      slug={slug}
      job={result.job}
      defaultName={defaultName}
      defaultEmail={user.email ?? ""}
      accentColor={result.organization.settings?.accentColor}
    />
  );
}
