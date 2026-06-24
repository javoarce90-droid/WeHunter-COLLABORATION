import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getProfileById } from "@/features/candidate/profile/data/profile.queries";
import { getProfileCvSignedUrl } from "@/features/candidate/profile/data/profile.storage";
import { CandidateProfileForm } from "@/features/candidate/profile/ui/CandidateProfileForm";
import { candidateLogoutAction } from "@/features/candidate/profile/actions";
import Link from "next/link";

export const metadata = {
  title: "Mi Perfil - WeHunter Talento",
  description: "Editá tu perfil y adjuntá tu currículum vitae en WeHunter.",
};

export default async function CandidateProfilePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/c/login");
  }

  const profile = await getProfileById(user.id);
  if (!profile) {
    // Si por alguna razón el perfil no se sincronizó
    redirect("/c/login");
  }

  // Si tiene un CV guardado, generamos la URL firmada de descarga
  const cvDownloadUrl = profile.cvUrl
    ? await getProfileCvSignedUrl(profile.cvUrl)
    : null;

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Header / Navbar del Candidato */}
      <header className="bg-sidebar text-white shadow-md border-b border-sidebar-alt/30">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/portal" className="font-display text-lg font-bold">
            <span className="text-ai">We</span>Hunter <span className="text-xs bg-primary px-2 py-0.5 rounded ml-1 font-sans font-normal">Talento</span>
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
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold font-display text-text">Configuración de Cuenta</h1>
          <p className="text-xs text-muted">Asegurate de que tu información profesional esté al día para aumentar tus posibilidades de contratación.</p>
        </div>

        <CandidateProfileForm
          initialFullName={profile.fullName ?? ""}
          initialEmail={profile.email}
          initialCvUrl={profile.cvUrl}
          initialCvDownloadUrl={cvDownloadUrl}
        />
      </main>
    </div>
  );
}
