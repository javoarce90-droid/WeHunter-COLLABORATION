"use client";

import { useState, useEffect } from "react";
import { MOCK_JOBS } from "@/features/candidate/portal/data/mock-jobs";
import { ApplicationStepper } from "@/features/candidate/portal/ui/ApplicationStepper";
import { retirarPostulacion, type MockApplication } from "@/features/candidate/portal/domain/gestionar-postulacion";
import { candidateLogoutAction } from "@/features/candidate/profile/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, MapPin, Briefcase, DollarSign } from "lucide-react";
import Link from "next/link";

export default function MisPostulacionesPage() {
  const [applications, setApplications] = useState<MockApplication[]>([]);
  const [selectedApp, setSelectedApp] = useState<MockApplication | null>(null);
  
  // Undo support state
  const [lastWithdrawnApp, setLastWithdrawnApp] = useState<MockApplication | null>(null);
  const [toastMessage, setToastMessage] = useState("");

  // Load from localStorage asynchronously to avoid hydration issues and ESLint react-hooks/set-state-in-effect
  useEffect(() => {
    const timer = setTimeout(() => {
      const apps = JSON.parse(localStorage.getItem("wh_applications") || "[]");
      setApplications(apps);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const handleWithdraw = (app: MockApplication) => {
    const updated = retirarPostulacion(applications, app.jobId);
    setApplications(updated);
    localStorage.setItem("wh_applications", JSON.stringify(updated));

    // Update applied array in localStorage so they can apply again
    const applied = JSON.parse(localStorage.getItem("wh_applied") || "[]") as string[];
    const updatedApplied = applied.filter((id) => id !== app.jobId);
    localStorage.setItem("wh_applied", JSON.stringify(updatedApplied));

    setLastWithdrawnApp(app);
    
    if (selectedApp?.jobId === app.jobId) {
      setSelectedApp(updated[0] || null);
    }

    showToast(`Retiraste tu postulación de ${app.jobTitle}`);
  };

  const handleUndoWithdraw = () => {
    if (!lastWithdrawnApp) return;

    const updated = [lastWithdrawnApp, ...applications];
    setApplications(updated);
    localStorage.setItem("wh_applications", JSON.stringify(updated));

    // Restore applied state
    const applied = JSON.parse(localStorage.getItem("wh_applied") || "[]") as string[];
    const updatedApplied = [...applied, lastWithdrawnApp.jobId];
    localStorage.setItem("wh_applied", JSON.stringify(updatedApplied));

    setSelectedApp(lastWithdrawnApp);
    setLastWithdrawnApp(null);
    showToast("Postulación restaurada.");
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    // Timeout to clear toast
    setTimeout(() => {
      setToastMessage("");
    }, 4000);
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Toast with Undo option */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-sidebar border border-sidebar-alt/30 text-white px-4 py-3.5 rounded-xl shadow-overlay flex items-center justify-between gap-4 text-xs font-semibold animate-toast-in border-l-4 border-l-primary">
          <div className="flex items-center gap-2.5">
            <div className="w-5 h-5 bg-primary/15 rounded-full flex items-center justify-center text-primary shrink-0">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span>{toastMessage}</span>
          </div>
          {lastWithdrawnApp && (
            <button
              onClick={handleUndoWithdraw}
              className="text-primary hover:text-primary-hover underline font-bold transition-all active:scale-95 hover:cursor-pointer pr-1"
            >
              Deshacer
            </button>
          )}
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
              className="text-xs font-semibold text-white/70 hover:text-white transition-colors"
            >
              Explorar Empleos
            </Link>
            <Link
              href="/portal/mis-postulaciones"
              className="text-xs font-semibold text-white border-b-2 border-primary pb-1"
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
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold font-display text-text">Mis Postulaciones</h1>
          <p className="text-xs text-muted">
            Seguí de cerca el avance de tus postulaciones y procesos de contratación.
          </p>
        </div>

        {applications.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Left Column: List of applied jobs */}
            <div className={[
              "flex flex-col gap-4 transition-all duration-300 w-full",
              selectedApp ? "lg:col-span-1 hidden lg:flex" : "lg:col-span-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            ].join(" ")}>
              {applications.map((app) => (
                <div
                  key={app.jobId}
                  onClick={() => setSelectedApp(app)}
                  className={[
                    "bg-surface border p-5 rounded-[var(--radius)] shadow-[var(--shadow)] hover:shadow-md cursor-pointer transition-all flex justify-between items-center gap-4 group",
                    selectedApp?.jobId === app.jobId
                      ? "border-primary/55 ring-1 ring-primary/10"
                      : "border-border hover:border-primary/35"
                  ].join(" ")}
                >
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
                      {app.company}
                    </span>
                    <h3 className="text-base font-bold text-text group-hover:text-primary transition-colors">
                      {app.jobTitle}
                    </h3>
                    <div className="flex items-center gap-3 text-[10px] text-muted mt-1">
                      <span>Postulado el: {app.appliedAt}</span>
                      <span>•</span>
                      <span>CV: {app.cvName}</span>
                    </div>
                  </div>

                  <Badge variant={app.stage} className="text-[10px]">
                    {app.stage === "new" && "Postulado"}
                    {app.stage === "screening" && "En revisión"}
                    {app.stage === "interview" && "Entrevista"}
                    {app.stage === "offer" && "Propuesta"}
                    {app.stage === "hired" && "Contratado"}
                    {app.stage === "rejected" && "Finalizado"}
                  </Badge>
                </div>
              ))}
            </div>

            {/* Right Column: Detailed panel containing all job details & stepper & withdraw */}
            {selectedApp && (
              <div className="lg:col-span-2 flex flex-col gap-6 bg-surface border border-border p-6 rounded-[var(--radius)] shadow-[var(--shadow)] animate-pop-in relative w-full">
                {/* Header with Title and Close button */}
                <div className="flex justify-between items-start border-b border-border/60 pb-5">
                  <div className="flex flex-col gap-1.5 pr-8">
                    <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                      {selectedApp.company}
                    </span>
                    <h2 className="text-xl font-bold font-display text-text leading-tight">
                      {selectedApp.jobTitle}
                    </h2>
                    <div className="flex items-center gap-3 text-[10px] text-muted mt-1">
                      <span>Postulado el: {selectedApp.appliedAt}</span>
                      <span>•</span>
                      <span>CV: {selectedApp.cvName}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedApp(null)}
                    className="p-1.5 -mr-1.5 rounded-xl hover:bg-muted/50 text-text hover:text-primary transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold border border-border/80 px-2.5 py-1 bg-surface shadow-xs active:scale-95"
                    type="button"
                    title="Cerrar detalles"
                  >
                    <span>Cerrar</span>
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Progress Stepper */}
                <div className="border border-border/60 p-5 rounded-[var(--radius)] bg-muted/5">
                  <h4 className="text-xs font-bold text-text mb-4">Progreso del Proceso</h4>
                  <ApplicationStepper currentStage={selectedApp.stage} />
                </div>

                {/* Offer details metadata if found */}
                {(() => {
                  const job = MOCK_JOBS.find(j => j.id === selectedApp.jobId);
                  if (!job) return null;
                  return (
                    <>
                      {/* Metadata Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-muted/10 border border-border/40 p-4 rounded-[var(--radius)]">
                        <div className="flex items-center gap-2.5 text-xs text-text">
                          <div className="p-1.5 bg-surface border border-border rounded-lg text-muted">
                            <MapPin className="w-4 h-4 text-muted" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[10px] text-muted font-medium">Ubicación</span>
                            <span className="font-semibold">{job.location}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2.5 text-xs text-text">
                          <div className="p-1.5 bg-surface border border-border rounded-lg text-muted">
                            <Briefcase className="w-4 h-4 text-muted" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[10px] text-muted font-medium">Modalidad</span>
                            <span className="font-semibold">{job.workplaceType}</span>
                          </div>
                        </div>
                        {job.salary && (
                          <div className="flex items-center gap-2.5 text-xs text-text">
                            <div className="p-1.5 bg-surface border border-border rounded-lg text-muted">
                              <DollarSign className="w-4 h-4 text-muted" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[10px] text-muted font-medium">Remuneración</span>
                              <span className="font-semibold text-success">{job.salary}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Description */}
                      <div className="flex flex-col gap-2">
                        <h3 className="text-xs font-bold text-text/80 uppercase tracking-wider">Descripción del puesto</h3>
                        <p className="text-sm text-text/80 leading-relaxed whitespace-pre-line bg-muted/5 border border-border/30 p-4 rounded-[var(--radius)] max-h-64 overflow-y-auto custom-scrollbar">
                          {job.description}
                        </p>
                      </div>

                      {/* Tech Tags */}
                      <div className="flex flex-col gap-2">
                        <h3 className="text-xs font-bold text-text/80 uppercase tracking-wider">Tecnologías / Requisitos</h3>
                        <div className="flex flex-wrap gap-1.5">
                          {job.tags.map((tag) => (
                            <Badge key={tag} variant="muted" className="text-xs px-2.5 py-0.5 rounded-md font-medium">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </>
                  );
                })()}

                {/* Withdraw application panel */}
                <div className="bg-danger/5 border border-danger/15 p-4 rounded-[var(--radius)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-2">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-bold text-danger">¿Querés retirarte de la búsqueda?</span>
                    <span className="text-[10px] text-muted leading-tight">Esta acción removerá tu postulación de forma permanente.</span>
                  </div>
                  <Button
                    onClick={() => handleWithdraw(selectedApp)}
                    variant="secondary"
                    className="border-danger/35 hover:border-danger/55 hover:bg-danger/5 text-danger hover:text-danger active:scale-95 text-xs h-9 py-1 px-4 shrink-0 font-semibold"
                  >
                    Retirar Postulación
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-16 bg-surface border border-border rounded-[var(--radius)] text-center">
            <svg className="w-16 h-16 text-muted mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            <h3 className="font-bold text-text mb-1">Aún no te postulaste a ningún empleo</h3>
            <p className="text-xs text-muted max-w-sm mb-6">
              Explorá las búsquedas de empleo disponibles y enviá tu CV para dar el primer paso.
            </p>
            <Link
              href="/portal"
              className="h-10 px-5 bg-primary hover:bg-primary-hover text-white font-semibold text-xs rounded-[var(--radius)] transition-all shadow-md shadow-primary/10 flex items-center justify-center"
            >
              Explorar Empleos
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
