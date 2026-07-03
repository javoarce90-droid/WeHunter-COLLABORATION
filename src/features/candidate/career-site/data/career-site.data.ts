import { cache } from "react";
import { sql } from "drizzle-orm";
import { admin } from "@/db/client";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import type {
  JobModality,
  JobSeniority,
  EmploymentType,
  JobArea,
} from "@/features/recruiter/jobs/domain/job-details";

/**
 * Acceso público (visitante SIN sesión) al Career Site. Toda la autorización vive en las
 * funciones SECURITY DEFINER de Postgres (get_career_site, get_career_site_job), que solo
 * exponen branding + búsquedas abiertas de esa organization, nunca candidatos ni datos
 * internos. Se invocan con el cliente admin SOLO para poder ejecutarlas sin usuario
 * autenticado — mismo patrón que shortlist-review.data.ts (empresa por token). Ver
 * migración 0021.
 */

const ORG_LOGOS_BUCKET = "org-logos";
const CAREER_SITE_MEDIA_BUCKET = "career-site-media";
const LOGO_SIGNED_URL_TTL_SECONDS = 60 * 10; // 10 min; se regenera en cada request (force-dynamic)

export type CareerSiteBranding = {
  description?: string;
  primaryColor?: string;
  accentColor?: string;
  website?: string;
  social?: { linkedin?: string; instagram?: string; x?: string; facebook?: string };
};

export type CareerSiteJobSummary = {
  id: string;
  title: string;
  position: string | null;
  jobArea: JobArea | null;
  location: string | null;
  modality: JobModality | null;
  seniority: JobSeniority | null;
  employmentType: EmploymentType | null;
  createdAt: string;
};

export type CareerSiteOrg = {
  organizationId: string;
  name: string;
  slug: string;
  logoUrl: string | null; // signed URL, ya resuelta
  coverUrl: string | null; // URL pública, ya resuelta
  settings: CareerSiteBranding | null;
};

type RawCareerSiteOrg = {
  organizationId: string;
  name: string;
  slug: string;
  logoUrl: string | null; // path crudo del bucket privado org-logos
  coverUrl: string | null; // path crudo del bucket público career-site-media
  settings: CareerSiteBranding | null;
};

function getCareerSiteCoverPublicUrl(path: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${CAREER_SITE_MEDIA_BUCKET}/${path}`;
}

async function getOrgLogoSignedUrl(path: string): Promise<string | null> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.storage
    .from(ORG_LOGOS_BUCKET)
    .createSignedUrl(path, LOGO_SIGNED_URL_TTL_SECONDS);
  if (error) return null;
  return data.signedUrl;
}

async function resolveOrg(raw: RawCareerSiteOrg): Promise<CareerSiteOrg> {
  const logoUrl = raw.logoUrl ? await getOrgLogoSignedUrl(raw.logoUrl) : null;
  return {
    organizationId: raw.organizationId,
    name: raw.name,
    slug: raw.slug,
    logoUrl,
    coverUrl: raw.coverUrl ? getCareerSiteCoverPublicUrl(raw.coverUrl) : null,
    settings: raw.settings,
  };
}

export type CareerSite = CareerSiteOrg & { jobs: CareerSiteJobSummary[] };

// cache(): el layout (header) y la page de listado piden lo mismo en el mismo request — que
// corra una sola vez, igual que getAuth() en src/db/client.ts.
export const getCareerSite = cache(async (slug: string): Promise<CareerSite | null> => {
  const rows = await admin.execute<{ result: (RawCareerSiteOrg & { jobs: CareerSiteJobSummary[] }) | null }>(
    sql`select get_career_site(${slug}) as result`,
  );
  const raw = rows[0]?.result;
  if (!raw) return null;

  const org = await resolveOrg(raw);
  return { ...org, jobs: raw.jobs };
});

export type CareerSiteJobDetail = {
  id: string;
  title: string;
  position: string | null;
  jobArea: JobArea | null;
  location: string | null;
  modality: JobModality | null;
  seniority: JobSeniority | null;
  employmentType: EmploymentType | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  skills: string[] | null;
  objectives: string | null;
  requirements: string | null;
  responsibilities: string | null;
  benefits: { name: string; description: string }[] | null;
  createdAt: string;
};

export type CareerSiteJobPage = {
  organization: CareerSiteOrg;
  job: CareerSiteJobDetail;
};

// cache(): generateMetadata y la page piden lo mismo en el mismo request.
export const getCareerSiteJob = cache(
  async (slug: string, jobId: string): Promise<CareerSiteJobPage | null> => {
    const rows = await admin.execute<{
      result: { organization: RawCareerSiteOrg; job: CareerSiteJobDetail } | null;
    }>(sql`select get_career_site_job(${slug}, ${jobId}::uuid) as result`);
    const raw = rows[0]?.result;
    if (!raw) return null;

    const organization = await resolveOrg(raw.organization);
    return { organization, job: raw.job };
  },
);
