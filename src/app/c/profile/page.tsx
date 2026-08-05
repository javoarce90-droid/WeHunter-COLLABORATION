import { redirect } from "next/navigation";
import { getAccountType, getCandidateProfile } from "@/lib/auth/session";
import { getCvSignedUrl } from "@/features/recruiter/candidates/data/candidates.storage";
import { getMyResume } from "@/features/candidate/profile/data/resume.queries";
import { CandidateProfileForm } from "@/features/candidate/profile/ui/CandidateProfileForm";
import { ExperienceSection } from "@/features/candidate/profile/ui/ExperienceSection";
import { EducationSection } from "@/features/candidate/profile/ui/EducationSection";
import { CertificationsSection } from "@/features/candidate/profile/ui/CertificationsSection";
import { LanguagesSection } from "@/features/candidate/profile/ui/LanguagesSection";
import { calcularCompletitud } from "@/features/candidate/profile/domain/calcular-completitud";
import { candidateLogoutAction } from "@/features/candidate/profile/actions";
import { DeleteAccountSection } from "@/features/candidate/account-deletion/ui/DeleteAccountSection";
import { Avatar } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
import { WehunterLogo } from "@/components/ui/wehunter-logo";
import Link from "next/link";

export const metadata = {
  title: "Mi Perfil - WeHunter Talento",
  description: "Editá tu perfil y adjuntá tu currículum vitae en WeHunter.",
};

export default async function CandidateProfilePage() {
  const candidate = await getCandidateProfile();
  if (!candidate) {
    redirect("/c/login");
  }

  const accountType = await getAccountType();
  if (accountType === "recruiter") {
    redirect("/dashboard");
  }

  const [cvDownloadUrl, resume] = await Promise.all([
    candidate.cvUrl ? getCvSignedUrl(candidate.cvUrl) : Promise.resolve(null),
    getMyResume(),
  ]);

  const completitud = calcularCompletitud(candidate, resume);

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Header / Navbar del Candidato */}
      <header className="bg-sidebar text-white shadow-md border-b border-sidebar-alt/30">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/portal" className="flex items-center gap-2">
            <WehunterLogo variant="white" height={22} priority />
            <span className="text-xs bg-primary px-2 py-0.5 rounded font-sans font-normal">Talento</span>
          </Link>

          <nav className="flex items-center gap-6">
            <Link
              href="/portal"
              className="text-xs font-semibold text-white/70 hover:text-white transition-colors"
            >
              Explorar Empleos
            </Link>
            <Link
              href="/portal/mis-postulaciones"
              className="text-xs font-semibold text-white/70 hover:text-white transition-colors"
            >
              Mis Postulaciones
            </Link>
            <Link
              href="/c/profile"
              className="text-xs font-semibold text-white border-b-2 border-primary pb-1"
            >
              Mi Perfil
            </Link>

            <span className="h-4 w-px bg-white/20" />

            <form action={candidateLogoutAction}>
              <button
                type="submit"
                className="text-xs font-semibold text-white/60 hover:text-danger hover:cursor-pointer transition-colors"
              >
                Cerrar Sesión
              </button>
            </form>
          </nav>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold font-display text-text">Perfil de candidato</h1>
          <p className="text-xs text-muted">Asegurate de que tu información profesional esté al día para aumentar tus posibilidades de contratación.</p>
        </div>

        {completitud.percent < 100 && (
          <div className="flex flex-col gap-2 rounded-[var(--radius)] border border-primary/20 bg-primary/5 p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] animate-pop-in">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-text">
                Tu perfil está {completitud.percent}% completo.
              </p>
              <span className="text-xs font-bold text-primary">{completitud.percent}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-primary/10">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${completitud.percent}%` }}
              />
            </div>
            {completitud.faltantes.length > 0 && (
              <p className="text-xs text-muted">
                Agregá {completitud.faltantes.slice(0, 3).join(", ")} para mejorar tus oportunidades.
              </p>
            )}
          </div>
        )}

        {/* Hero de perfil */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-surface border border-border/80 rounded-[var(--radius)] shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.03)] p-6 animate-pop-in">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar name={candidate.fullName || candidate.email} size="lg" />
            <div className="min-w-0">
              <h2 className="font-display text-xl font-bold text-text truncate">
                {candidate.fullName || candidate.email}
              </h2>
              {candidate.headline && (
                <p className="mt-0.5 truncate text-sm font-medium text-muted">{candidate.headline}</p>
              )}
              {candidate.location && (
                <p className="mt-0.5 text-xs text-muted">{candidate.location}</p>
              )}
            </div>
          </div>

          {cvDownloadUrl && (
            <a
              href={cvDownloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: "secondary", size: "sm" })}
            >
              Ver CV
            </a>
          )}
        </div>

        {/* Datos + currículum */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-start">
          <CandidateProfileForm
            initialFullName={candidate.fullName ?? ""}
            initialEmail={candidate.email}
            initialHeadline={candidate.headline}
            initialPhone={candidate.phone}
            initialLocation={candidate.location}
            initialLinkedinUrl={candidate.linkedinUrl}
            initialSummary={candidate.bio}
            initialSkills={candidate.skills}
            initialCvUrl={candidate.cvUrl}
            initialCvDownloadUrl={cvDownloadUrl}
            wide
          />

          <div className="flex flex-col gap-6">
            <ExperienceSection experiences={resume.experiences} />
            <EducationSection education={resume.education} />
            <CertificationsSection certifications={resume.certifications} />
            <LanguagesSection languages={resume.languages} />
          </div>
        </div>

        <DeleteAccountSection />
      </main>
    </div>
  );
}
