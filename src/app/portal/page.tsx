"use client";

import { useState, useEffect } from "react";
import { MOCK_JOBS, type Job } from "@/features/candidate/portal/data/mock-jobs";
import { JobCard } from "@/features/candidate/portal/ui/JobCard";
import { ApplicationModal } from "@/features/candidate/portal/ui/ApplicationModal";
import { JobDetailsModal } from "@/features/candidate/portal/ui/JobDetailsModal";
import { filtrarEmpleos } from "@/features/candidate/portal/domain/filtrar-empleos";
import { alternarFavorito } from "@/features/candidate/portal/domain/gestionar-favoritos";
import { crearPostulacion } from "@/features/candidate/portal/domain/gestionar-postulacion";
import { candidateLogoutAction } from "@/features/candidate/profile/actions";
import Link from "next/link";

export default function PortalPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [search, setSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "favorites" | "hidden">("all");
  
  // Persistence state
  const [favorites, setFavorites] = useState<string[]>([]);
  const [hidden, setHidden] = useState<string[]>([]);
  const [applied, setApplied] = useState<string[]>([]);
  
  // Modal selection
  const [activeApplyJob, setActiveApplyJob] = useState<Job | null>(null);
  const [selectedJobForDetails, setSelectedJobForDetails] = useState<Job | null>(null);

  // Success message toast
  const [toastMessage, setToastMessage] = useState("");

  // Load from localStorage asynchronously to avoid hydration issues and ESLint react-hooks/set-state-in-effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setJobs(MOCK_JOBS);
      setFavorites(JSON.parse(localStorage.getItem("wh_favorites") || "[]"));
      setHidden(JSON.parse(localStorage.getItem("wh_hidden") || "[]"));
      setApplied(JSON.parse(localStorage.getItem("wh_applied") || "[]"));
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const handleToggleFavorite = (jobId: string) => {
    const updated = alternarFavorito(favorites, jobId);
    setFavorites(updated);
    localStorage.setItem("wh_favorites", JSON.stringify(updated));
  };

  const handleToggleHideJob = (jobId: string) => {
    let updated: string[];
    let message: string;
    if (hidden.includes(jobId)) {
      updated = hidden.filter((id) => id !== jobId);
      message = "Oferta visible nuevamente.";
    } else {
      updated = [...hidden, jobId];
      message = "Oferta ocultada correctamente.";
    }
    setHidden(updated);
    localStorage.setItem("wh_hidden", JSON.stringify(updated));
    showToast(message);
  };

  const handleApplySubmit = (data: {
    fullName: string;
    email: string;
    phone: string;
    linkedinUrl?: string;
    cvName: string;
    gdprConsent: boolean;
  }) => {
    if (!activeApplyJob) return;
    
    // Save application details in localStorage
    const existingApplications = JSON.parse(localStorage.getItem("wh_applications") || "[]");
    
    const { updatedApplications } = crearPostulacion(
      activeApplyJob,
      data.fullName,
      data.cvName,
      existingApplications
    );

    localStorage.setItem("wh_applications", JSON.stringify(updatedApplications));

    const updatedApplied = [...applied, activeApplyJob.id];
    setApplied(updatedApplied);
    localStorage.setItem("wh_applied", JSON.stringify(updatedApplied));

    setActiveApplyJob(null);
    showToast(`¡Te postulaste con éxito a ${activeApplyJob.title}!`);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3000);
  };

  // Filter jobs using the domain logic
  const filteredJobs = filtrarEmpleos({
    jobs,
    hiddenIds: hidden,
    favoriteIds: favorites,
    search,
    locationFilter,
    filterTab,
  });

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-sidebar border border-sidebar-alt/30 text-white px-4 py-3.5 rounded-xl shadow-overlay flex items-center gap-3 text-xs font-semibold animate-toast-in border-l-4 border-l-primary">
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
          <Link href="/portal" className="font-display text-lg font-bold">
            <span className="text-ai">We</span>Hunter{" "}
            <span className="text-xs bg-primary px-2 py-0.5 rounded ml-1 font-sans font-normal">
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

        {/* Tabs for All, Favorites, Hidden */}
        <div className="flex w-fit max-w-full flex-wrap items-center gap-1 rounded-[var(--radius)] border border-border bg-surface p-1 shadow-[var(--shadow)]">
          <button
            onClick={() => setFilterTab("all")}
            className={[
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all active:scale-95 hover:cursor-pointer",
              filterTab === "all"
                ? "bg-primary text-white"
                : "text-muted hover:bg-bg hover:text-text",
            ].join(" ")}
          >
            Todos los empleos
          </button>
          <button
            onClick={() => setFilterTab("favorites")}
            className={[
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all active:scale-95 hover:cursor-pointer",
              filterTab === "favorites"
                ? "bg-primary text-white"
                : "text-muted hover:bg-bg hover:text-text",
            ].join(" ")}
          >
            Favoritos
            <span
              className={[
                "tabular-nums text-[10px] font-bold px-1.5 py-0.5 rounded-full transition-colors",
                filterTab === "favorites" ? "bg-white/20 text-white" : "bg-primary-light text-primary",
              ].join(" ")}
            >
              {favorites.length}
            </span>
          </button>
          <button
            onClick={() => setFilterTab("hidden")}
            className={[
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all active:scale-95 hover:cursor-pointer",
              filterTab === "hidden"
                ? "bg-primary text-white"
                : "text-muted hover:bg-bg hover:text-text",
            ].join(" ")}
          >
            Ocultos
            <span
              className={[
                "tabular-nums text-[10px] font-bold px-1.5 py-0.5 rounded-full transition-colors",
                filterTab === "hidden" ? "bg-white/20 text-white" : "bg-primary-light text-primary",
              ].join(" ")}
            >
              {hidden.length}
            </span>
          </button>
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
                isFavorite={favorites.includes(job.id)}
                isApplied={applied.includes(job.id)}
                isHidden={hidden.includes(job.id)}
                onToggleFavorite={handleToggleFavorite}
                onHide={handleToggleHideJob}
                onApply={(j) => setActiveApplyJob(j)}
                onClickCard={() => setSelectedJobForDetails(job)}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-12 bg-surface border border-border/30 rounded-2xl text-center">
            <svg className="w-12 h-12 text-muted mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="font-bold text-text mb-1">No se encontraron ofertas</h3>
            <p className="text-xs text-muted max-w-xs">
              Probá ajustando los términos de búsqueda o removiendo algún filtro.
            </p>
          </div>
        )}
      </main>

      {/* Application Modal */}
      {activeApplyJob && (
        <ApplicationModal
          job={activeApplyJob}
          onClose={() => setActiveApplyJob(null)}
          onSubmit={handleApplySubmit}
        />
      )}

      {/* Job Details Modal */}
      {selectedJobForDetails && (
        <JobDetailsModal
          job={selectedJobForDetails}
          isApplied={applied.includes(selectedJobForDetails.id)}
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
