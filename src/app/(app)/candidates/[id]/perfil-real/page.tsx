import { notFound } from "next/navigation";
import { getActiveMembership } from "@/lib/auth/session";
import { getCandidateById } from "@/features/recruiter/candidates/data/candidates.queries";
import { getLinkedCandidateProfile } from "@/features/recruiter/candidates/data/linked-profile.queries";
import { getCvSignedUrl } from "@/features/recruiter/candidates/data/candidates.storage";
import { EMPLOYMENT_LABELS, MODALITY_LABELS } from "@/features/recruiter/jobs/ui/field-meta";
import { normalizeIfUncapitalized } from "@/lib/text";

const dateFormatter = new Intl.DateTimeFormat("es-AR", { month: "short", year: "numeric" });

function formatRange(startDate: string | null, endDate: string | null): string {
  const start = startDate ? dateFormatter.format(new Date(startDate)) : "—";
  const end = endDate ? dateFormatter.format(new Date(endDate)) : "Actualidad";
  return `${start} – ${end}`;
}

/**
 * Solo lectura: el perfil real que el propio candidato cargó, una vez vinculado
 * (candidates.profile_id). Nunca reemplaza ni fusiona lo que el recruiter tiene cargado en
 * la ficha (Perfil) — es una vista aparte, deliberadamente separada (ver plan).
 */
export default async function LinkedCandidateProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const membership = await getActiveMembership();
  if (!membership) notFound();

  const candidate = await getCandidateById(id, membership.organizationId);
  if (!candidate || !candidate.profileId) notFound();

  const profile = await getLinkedCandidateProfile(id);
  if (!profile) notFound();

  const cvDownloadUrl = profile.cvUrl ? await getCvSignedUrl(profile.cvUrl) : null;

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-[var(--radius)] border border-border bg-surface p-5 shadow-[var(--shadow)]">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-sm font-bold text-text">
            {profile.fullName ? normalizeIfUncapitalized(profile.fullName) : "Perfil del candidato"}
          </h2>
          {cvDownloadUrl && (
            <a
              href={cvDownloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 text-xs font-semibold text-primary hover:text-primary-hover"
            >
              Abrir CV →
            </a>
          )}
        </div>
        {profile.headline && <p className="mt-0.5 text-sm text-text/80">{profile.headline}</p>}
        <p className="mt-1 text-xs text-muted">
          {[profile.location, profile.email].filter(Boolean).join(" · ")}
        </p>
        {profile.bio && (
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-text/80">
            {profile.bio}
          </p>
        )}
        {(profile.skills?.length ?? 0) > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {profile.skills!.map((s) => (
              <span
                key={s}
                className="rounded-full bg-primary-light px-2.5 py-0.5 text-xs font-semibold text-primary-hover"
              >
                {normalizeIfUncapitalized(s)}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 bg-surface border border-border p-6 rounded-[var(--radius)] shadow-[var(--shadow)]">
        <h3 className="text-base font-bold font-display text-text">Experiencia laboral</h3>
        {profile.experiences.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {profile.experiences.map((exp) => (
              <li key={exp.id} className="rounded-[var(--radius)] border border-border/60 bg-bg/40 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-text">{exp.position}</p>
                    <p className="text-xs text-muted">{exp.company}</p>
                  </div>
                  <span className="text-[11px] text-muted shrink-0">
                    {formatRange(exp.startDate, exp.endDate)}
                  </span>
                </div>
                {(exp.employmentType || exp.modality) && (
                  <p className="mt-1 text-[11px] text-muted">
                    {[
                      exp.employmentType
                        ? EMPLOYMENT_LABELS[exp.employmentType as keyof typeof EMPLOYMENT_LABELS]
                        : null,
                      exp.modality ? MODALITY_LABELS[exp.modality as keyof typeof MODALITY_LABELS] : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
                {exp.description && <p className="mt-2 text-sm text-text/80 leading-relaxed">{exp.description}</p>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">Sin datos</p>
        )}
      </div>

      <div className="flex flex-col gap-3 bg-surface border border-border p-6 rounded-[var(--radius)] shadow-[var(--shadow)]">
        <h3 className="text-base font-bold font-display text-text">Educación</h3>
        {profile.education.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {profile.education.map((edu) => (
              <li key={edu.id} className="rounded-[var(--radius)] border border-border/60 bg-bg/40 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-text">{edu.degree}</p>
                    <p className="text-xs text-muted">
                      {edu.institution}
                      {edu.fieldOfStudy ? ` · ${edu.fieldOfStudy}` : ""}
                    </p>
                  </div>
                  <span className="text-[11px] text-muted shrink-0">
                    {formatRange(edu.startDate, edu.endDate)}
                  </span>
                </div>
                {edu.description && <p className="mt-2 text-sm text-text/80 leading-relaxed">{edu.description}</p>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">Sin datos</p>
        )}
      </div>

      <div className="flex flex-col gap-3 bg-surface border border-border p-6 rounded-[var(--radius)] shadow-[var(--shadow)]">
        <h3 className="text-base font-bold font-display text-text">Certificaciones</h3>
        {profile.certifications.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {profile.certifications.map((cert) => (
              <li
                key={cert.id}
                className="flex items-center justify-between gap-3 rounded-[var(--radius)] border border-border/60 bg-bg/40 px-4 py-2.5"
              >
                <p className="text-sm font-semibold text-text">{cert.name}</p>
                {cert.url && (
                  <a
                    href={cert.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline"
                  >
                    Ver certificado
                  </a>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">Sin datos</p>
        )}
      </div>
    </div>
  );
}
