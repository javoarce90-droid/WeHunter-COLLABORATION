import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { getCareerSite } from "@/features/candidate/career-site/data/career-site.data";
import { CareerSiteHeader } from "@/features/candidate/career-site/ui/CareerSiteHeader";

// Visitante sin sesión: nada de cache, cada visita valida contra la base (igual que /share/[token]).
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const careerSite = await getCareerSite(slug);
  if (!careerSite) return {};

  return {
    title: `${careerSite.name} · Búsquedas abiertas`,
    description: careerSite.settings?.description,
    openGraph: {
      title: careerSite.name,
      description: careerSite.settings?.description,
      images: careerSite.coverUrl ? [careerSite.coverUrl] : undefined,
    },
  };
}

export default async function CareerSiteLayout({
  params,
  children,
}: {
  params: Promise<{ slug: string }>;
  children: ReactNode;
}) {
  const { slug } = await params;
  const careerSite = await getCareerSite(slug);
  if (!careerSite) notFound();

  return (
    <div className="min-h-dvh bg-bg">
      <CareerSiteHeader org={careerSite} />
      <main className="mx-auto max-w-3xl px-4 py-8">{children}</main>
    </div>
  );
}
