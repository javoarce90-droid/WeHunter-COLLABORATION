import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { getCareerSiteJob } from "@/features/candidate/career-site/data/career-site.data";
import { PublicJobDetail } from "@/features/candidate/career-site/ui/PublicJobDetail";
import { TrackJobView } from "@/features/candidate/career-site/ui/TrackJobView";
import { buttonVariants } from "@/components/ui/button";

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
  // Sin `notFound()` a propósito: el slug ya lo validó `careers/[slug]/layout.tsx` (si llegamos
  // acá, la org existe y su header ya se está renderizando) — un link viejo a una búsqueda que
  // se cerró/archivó no es "la página no existe", es "ya no está disponible". Mostramos eso
  // adentro del mismo shell de marca, en vez de un 404 genérico sin estilo.
  if (!result) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-[var(--radius)] border border-border bg-surface px-6 py-14 text-center shadow-[var(--shadow)]">
        <h1 className="font-display text-lg font-bold text-text">
          Esta búsqueda ya no está disponible
        </h1>
        <p className="max-w-sm text-sm text-muted">
          Puede que ya se haya cerrado o que el link haya cambiado.
        </p>
        <Link href={`/careers/${slug}`} className={buttonVariants({ variant: "primary" })}>
          Ver búsquedas abiertas
        </Link>
      </div>
    );
  }

  // URL base resuelta en el server (host de la request), igual que en jobs/[id]/shortlists.
  const reqHeaders = await headers();
  const host = reqHeaders.get("host") ?? "";
  const proto = reqHeaders.get("x-forwarded-proto") ?? "http";
  const shareUrl = host ? `${proto}://${host}/careers/${slug}/${jobId}` : "";

  return (
    <>
      <TrackJobView slug={slug} jobId={jobId} />
      <PublicJobDetail
        slug={slug}
        job={result.job}
        shareUrl={shareUrl}
        accentColor={result.organization.settings?.accentColor}
      />
    </>
  );
}
