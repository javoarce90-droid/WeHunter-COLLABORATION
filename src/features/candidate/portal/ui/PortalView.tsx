"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { type Job } from "../data/mock-jobs";
import { JobCard } from "./JobCard";
import { ApplicationModal } from "./ApplicationModal";
import { JobDetailsModal } from "./JobDetailsModal";
import { filtrarEmpleos } from "../domain/filtrar-empleos";
import { candidateLogoutAction } from "@/features/candidate/profile/actions";
import { EmptyState } from "@/components/ui/empty-state";
import { WehunterLogo } from "@/components/ui/wehunter-logo";
import Link from "next/link";

interface PortalViewProps {
  initialJobs: Job[];
  appliedJobIds: string[];
  candidate: {
    fullName: string;
    email: string;
    phone: string;
    linkedinUrl: string;
    cvUrl: string | null;
  };
  notificationBell?: ReactNode;
}

export function PortalView({
  initialJobs,
  appliedJobIds,
  candidate,
  notificationBell,
}: PortalViewProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState("");

  const [applied, setApplied] = useState<string[]>(appliedJobIds);

  const [activeApplyJob, setActiveApplyJob] = useState<Job | null>(null);
  const [selectedJobForDetails, setSelectedJobForDetails] = useState<Job | null>(null);

  const [toastMessage, setToastMessage] = useState("");
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3000);
  };

  const handleApplySuccess = () => {
    if (!activeApplyJob) return;
    setApplied([...applied, activeApplyJob.id]);
    showToast(`¡Te postulaste con éxito a ${activeApplyJob.title}!`);
    setActiveApplyJob(null);
    router.refresh();
  };

  const filteredJobs = filtrarEmpleos({
    jobs: initialJobs,
    appliedIds: applied,
    search,
    locationFilter,
  });

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-sidebar border border-sidebar-alt/50 text-white px-4 py-3.5 rounded-xl shadow-overlay flex items-center gap-3 text-xs font-semibold animate-toast-in">
          <div className="w-5 h-5 bg-primary/15 rounded-full flex items-center justify-center text-primary shrink-0">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <span className="pr-1">{toastMessage}</span>
        </div>
      )}

      {/* Header / Navbar */}
      <header className="bg-sidebar text-white shadow-md border-b border-sidebar-alt/30">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/portal" className="flex items-center gap-2">
            <WehunterLogo variant="white" height={22} />
            <span className="text-xs bg-primary px-2 py-0.5 rounded font-sans font-normal">
              Talento
            </span>
          </Link>

          <nav className="flex items-center gap-6">
            <Link
              href="/portal"
              className="text-xs font-semibold text-white border-b-2 border-primary pb-1"
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
              className="text-xs font-semibold text-white/70 hover:text-white transition-colors"
            >
              Mi Perfil
            </Link>

            <span className="h-4 w-px bg-white/20" />

            {notificationBell}

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

      {/* Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 flex flex-col gap-6">
        {/* Title */}
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold font-display text-text">Explorar Empleos</h1>
          <p className="text-xs text-muted">
            Encontrá y postulate a los mejores puestos de tecnología.
          </p>
        </div>

        {/* Search Bar & Filters Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-surface border border-border p-4 rounded-[var(--radius)] shadow-[var(--shadow)]">
          <div className="relative md:col-span-2">
            <input
              type="text"
              placeholder="Buscar por puesto, empresa o tecnología (ej: React, AWS...)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-11 pl-10 pr-4 bg-surface border border-border focus:border-primary focus:ring-2 focus:ring-[rgba(123,47,219,0.2)] rounded-[var(--radius)] text-sm transition-all outline-none"
            />
            <svg
              className="absolute left-3.5 top-3.5 w-4 h-4 text-muted"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <div>
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="w-full h-11 px-3 bg-surface border border-border focus:border-primary focus:ring-2 focus:ring-[rgba(123,47,219,0.2)] rounded-[var(--radius)] text-sm transition-all outline-none hover:cursor-pointer"
            >
              <option value="">Todas las ubicaciones</option>
              <option value="Remoto">Remoto</option>
              <option value="Buenos Aires">Buenos Aires, AR</option>
              <option value="Chile">Chile</option>
              <option value="Uruguay">Uruguay</option>
            </select>
          </div>
        </div>

        {/* Job Cards Grid */}
        {filteredJobs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
            {filteredJobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                onApply={(j) => setActiveApplyJob(j)}
                onClickCard={() => setSelectedJobForDetails(job)}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            variant="subtle"
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            title="No se encontraron ofertas"
            description="Probá ajustando los términos de búsqueda o removiendo algún filtro."
          />
        )}
      </main>

      {/* Application Modal */}
      {activeApplyJob && (
        <ApplicationModal
          job={activeApplyJob}
          candidate={candidate}
          onClose={() => setActiveApplyJob(null)}
          onSuccess={handleApplySuccess}
        />
      )}

      {/* Job Details Modal */}
      {selectedJobForDetails && (
        <JobDetailsModal
          job={selectedJobForDetails}
          isApplied={false}
          onClose={() => setSelectedJobForDetails(null)}
          onApply={() => {
            const jobToApply = selectedJobForDetails;
            setSelectedJobForDetails(null);
            setActiveApplyJob(jobToApply);
          }}
        />
      )}
    </div>
  );
}
