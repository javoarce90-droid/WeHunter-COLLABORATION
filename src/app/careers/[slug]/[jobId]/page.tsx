import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getCareerSiteJob } from "@/features/candidate/career-site/data/career-site.data";
import { PublicJobDetail } from "@/features/candidate/career-site/ui/PublicJobDetail";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; jobId: string }>;
}): Promise<Metadata> {
  const { slug, jobId } = await params;
  const result = await getCareerSiteJob(slug, jobId);
  if (!result) return {};

  return {
    title: `${result.job.title} · ${result.organization.name}`,
    description: result.job.objectives ?? undefined,
    openGraph: {
      title: result.job.title,
      description: result.job.objectives ?? undefined,
      images: result.organization.coverUrl ? [result.organization.coverUrl] : undefined,
    },
  };
}

export default async function CareerSiteJobPage({
  params,
}: {
  params: Promise<{ slug: string; jobId: string }>;
}) {
  const { slug, jobId } = await params;
  const result = await getCareerSiteJob(slug, jobId);
  if (!result) notFound();

  // URL base resuelta en el server (host de la request), igual que en jobs/[id]/shortlists.
  const reqHeaders = await headers();
  const host = reqHeaders.get("host") ?? "";
  const proto = reqHeaders.get("x-forwarded-proto") ?? "http";
  const shareUrl = host ? `${proto}://${host}/careers/${slug}/${jobId}` : "";

  return (
    <PublicJobDetail
      slug={slug}
      job={result.job}
      shareUrl={shareUrl}
      accentColor={result.organization.settings?.accentColor}
    />
  );
}
