"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ApplicationStepper } from "./ApplicationStepper";
import {
  toStepperStage,
  puedeRetirarPostulacion,
  ESTADO_VISIBLE_LABELS,
  type PortalApplication,
} from "../domain/gestionar-postulacion";
import { retirarPostulacionAction } from "../actions";
import { candidateLogoutAction } from "@/features/candidate/profile/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { WehunterLogo } from "@/components/ui/wehunter-logo";
import {
  X,
  MapPin,
  Briefcase,
  DollarSign,
  Building2,
  Award,
  Clock,
  Users,
} from "lucide-react";
import Link from "next/link";
import {
  AREA_LABELS,
  SENIORITY_LABELS,
  EMPLOYMENT_LABELS,
} from "@/features/recruiter/jobs/ui/field-meta";
import { JobMarkdown } from "@/features/recruiter/jobs/ui/markdown";

type StageFilter = "all" | ReturnType<typeof toStepperStage>;

const STAGE_FILTERS: StageFilter[] = [
  "all",
  "new",
  "screening",
  "interview",
  "offer",
  "hired",
  "rejected",
];

const FILTER_LABEL: Record<StageFilter, string> = {
  all: "Todas",
  ...ESTADO_VISIBLE_LABELS,
};

interface MisPostulacionesViewProps {
  initialApplications: PortalApplication[];
  notificationBell?: ReactNode;
}

export function MisPostulacionesView({
  initialApplications,
  notificationBell,
}: MisPostulacionesViewProps) {
  const router = useRouter();
  const [applications, setApplications] = useState(initialApplications);
  const [selectedApp, setSelectedApp] = useState<PortalApplication | null>(
    null,
  );
  const [toastMessage, setToastMessage] = useState("");
  const [activeFilter, setActiveFilter] = useState<StageFilter>("all");

  const filterCounts = STAGE_FILTERS.reduce(
    (acc, key) => {
      acc[key] =
        key === "all"
          ? applications.length
          : applications.filter((a) => toStepperStage(a.stage) === key).length;
      return acc;
    },
    {} as Record<StageFilter, number>,
  );

  const filteredApplications =
    activeFilter === "all"
      ? applications
      : applications.filter((a) => toStepperStage(a.stage) === activeFilter);

  const metadata = selectedApp
    ? [
        { icon: MapPin, label: "Ubicación", value: selectedApp.location },
        selectedApp.jobArea
          ? {
              icon: Building2,
              label: "Área",
              value: AREA_LABELS[selectedApp.jobArea],
            }
          : null,
        {
          icon: Briefcase,
          label: "Modalidad",
          value: selectedApp.workplaceType,
        },
        selectedApp.seniority
          ? {
              icon: Award,
              label: "Seniority",
              value: SENIORITY_LABELS[selectedApp.seniority],
            }
          : null,
        selectedApp.employmentType
          ? {
              icon: Clock,
              label: "Jornada",
              value: EMPLOYMENT_LABELS[selectedApp.employmentType],
            }
          : null,
        selectedApp.vacancies
          ? {
              icon: Users,
              label: "Vacantes",
              value: `${selectedApp.vacancies} ${selectedApp.vacancies === 1 ? "puesto" : "puestos"}`,
            }
          : null,
        selectedApp.salary
          ? {
              icon: DollarSign,
              label: "Remuneración",
              value: selectedApp.salary,
              valueClassName: "text-success",
            }
          : null,
      ].filter((m): m is NonNullable<typeof m> => m !== null)
    : [];

  const sections = selectedApp
    ? [
        { title: "Objetivos del puesto", body: selectedApp.objectives },
        { title: "Responsabilidades", body: selectedApp.responsibilities },
        { title: "Requisitos", body: selectedApp.requirements },
      ].filter((s): s is { title: string; body: string } => !!s.body?.trim())
    : [];

  const hasDetails =
    sections.length > 0 || (selectedApp?.benefits?.length ?? 0) > 0;

  const canWithdraw = !!selectedApp && puedeRetirarPostulacion(selectedApp.stage);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 4000);
  };

  const handleWithdraw = async (app: PortalApplication) => {
    const updated = applications.filter(
      (a) => a.applicationId !== app.applicationId,
    );
    setApplications(updated);
    if (selectedApp?.applicationId === app.applicationId) {
      setSelectedApp(updated[0] || null);
    }
    showToast(`Retiraste tu postulación de ${app.jobTitle}`);
    await retirarPostulacionAction(app.applicationId);
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-sidebar border border-sidebar-alt/50 text-white px-4 py-3.5 rounded-xl shadow-overlay flex items-center justify-between gap-4 text-xs font-semibold animate-toast-in">
          <div className="flex items-center gap-2.5">
            <div className="w-5 h-5 bg-primary/15 rounded-full flex items-center justify-center text-primary shrink-0">
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <span>{toastMessage}</span>
          </div>
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
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold font-display text-text">
            Mis Postulaciones
          </h1>
          <p className="text-xs text-muted">
            Seguí de cerca el avance de tus postulaciones y procesos de
            contratación.
          </p>
        </div>

        {applications.length > 0 && (
          <nav
            aria-label="Filtrar postulaciones por estado"
            className="flex w-fit max-w-full flex-wrap items-center gap-1 rounded-[var(--radius)] border border-border bg-surface p-1 shadow-[var(--shadow)]"
          >
            {STAGE_FILTERS.map((key) => {
              const isActive = key === activeFilter;
              return (
                <button
                  key={key}
                  type="button"
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => {
                    setActiveFilter(key);
                    setSelectedApp(null);
                  }}
                  className={[
                    "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                    isActive
                      ? "bg-primary text-white"
                      : "text-muted hover:bg-bg hover:text-text",
                  ].join(" ")}
                >
                  {FILTER_LABEL[key]}
                  <span
                    className={[
                      "tabular-nums",
                      isActive ? "text-white/70" : "text-muted/70",
                    ].join(" ")}
                  >
                    {filterCounts[key]}
                  </span>
                </button>
              );
            })}
          </nav>
        )}

        {applications.length > 0 ? (
          filteredApplications.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              {/* Left Column: List of applied jobs */}
              <div
                className={[
                  "flex flex-col gap-4 transition-all duration-300 w-full",
                  selectedApp
                    ? "lg:col-span-1 hidden lg:flex"
                    : "lg:col-span-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6",
                ].join(" ")}
              >
                {filteredApplications.map((app) => (
                  <div
                    key={app.applicationId}
                    onClick={() => setSelectedApp(app)}
                    className={[
                      "bg-surface border p-5 rounded-[var(--radius)] shadow-[var(--shadow)] hover:shadow-md cursor-pointer transition-all flex justify-between items-center gap-4 group",
                      selectedApp?.applicationId === app.applicationId
                        ? "border-primary/55 ring-1 ring-primary/10"
                        : "border-border hover:border-primary/35",
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
                        <span>
                          Postulado el:{" "}
                          {new Date(app.appliedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <Badge
                      variant={toStepperStage(app.stage)}
                      className="text-[10px] whitespace-nowrap w-fit"
                    >
                      {ESTADO_VISIBLE_LABELS[toStepperStage(app.stage)]}
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
                        <span>
                          Postulado el:{" "}
                          {new Date(selectedApp.appliedAt).toLocaleDateString()}
                        </span>
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
                    <h4 className="text-xs font-bold text-text mb-4">
                      Progreso del Proceso
                    </h4>
                    <ApplicationStepper
                      currentStage={toStepperStage(selectedApp.stage)}
                    />
                  </div>

                  {/* Metadata Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-muted/10 border border-border/40 p-4 rounded-[var(--radius)]">
                    {metadata.map(
                      ({ icon: Icon, label, value, valueClassName }) => (
                        <div
                          key={label}
                          className="flex items-center gap-2.5 text-xs text-text"
                        >
                          <div className="p-1.5 bg-surface border border-border rounded-lg text-muted">
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[10px] text-muted font-medium">
                              {label}
                            </span>
                            <span
                              className={["font-semibold", valueClassName]
                                .filter(Boolean)
                                .join(" ")}
                            >
                              {value}
                            </span>
                          </div>
                        </div>
                      ),
                    )}
                  </div>

                  {hasDetails ? (
                    <>
                      {/* Objetivos / Responsabilidades / Requisitos */}
                      {sections.map((s) => (
                        <div key={s.title} className="flex flex-col gap-2">
                          <h3 className="text-xs font-bold text-text/80 uppercase tracking-wider">
                            {s.title}
                          </h3>
                          <div className="text-sm text-text/80 leading-relaxed bg-muted/5 border border-border/30 p-4 rounded-[var(--radius)] max-h-64 overflow-y-auto custom-scrollbar">
                            <JobMarkdown text={s.body} />
                          </div>
                        </div>
                      ))}

                      {/* Beneficios (cards) */}
                      {(selectedApp.benefits?.length ?? 0) > 0 && (
                        <div className="flex flex-col gap-2">
                          <h3 className="text-xs font-bold text-text/80 uppercase tracking-wider">
                            Beneficios
                          </h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {selectedApp.benefits!.map((b, i) => (
                              <div
                                key={i}
                                className="rounded-[var(--radius)] border border-border/60 bg-bg/40 px-3 py-2.5"
                              >
                                <p className="text-xs font-bold text-text">
                                  {b.name}
                                </p>
                                {b.description && (
                                  <p className="mt-0.5 text-[11px] text-muted leading-relaxed">
                                    {b.description}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-muted">
                      {selectedApp.description}
                    </p>
                  )}

                  {/* Skills */}
                  {selectedApp.tags.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <h3 className="text-xs font-bold text-text/80 uppercase tracking-wider">
                        Skills
                      </h3>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedApp.tags.map((tag) => (
                          <Badge
                            key={tag}
                            variant="muted"
                            className="text-xs px-2.5 py-0.5 rounded-md font-medium"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Withdraw application panel */}
                  <div className="bg-danger/5 border border-danger/15 p-4 rounded-[var(--radius)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-2">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-bold text-danger">
                        ¿Querés retirarte de la búsqueda?
                      </span>
                      <span className="text-[10px] text-muted leading-tight">
                        {canWithdraw
                          ? "Esta acción removerá tu postulación de forma permanente."
                          : "Ya no podés retirarte: el proceso avanzó a la etapa de " +
                            ESTADO_VISIBLE_LABELS[toStepperStage(selectedApp.stage)].toLowerCase() +
                            "."}
                      </span>
                    </div>
                    <Button
                      onClick={() => handleWithdraw(selectedApp)}
                      disabled={!canWithdraw}
                      variant="secondary"
                      className="border-danger/35 hover:border-danger/55 hover:bg-danger/5 text-danger hover:text-danger active:scale-95 text-xs h-9 py-1 px-4 shrink-0 font-semibold disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-danger/35 disabled:hover:bg-transparent"
                    >
                      Retirar Postulación
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted">
              No tenés postulaciones en estado &quot;
              {FILTER_LABEL[activeFilter]}&quot;.
            </p>
          )
        ) : (
          <EmptyState
            variant="activation"
            icon={
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                />
              </svg>
            }
            title="Aún no te postulaste a ningún empleo"
            description="Explorá las búsquedas de empleo disponibles y enviá tu CV para dar el primer paso."
            action={{ label: "Explorar Empleos", href: "/portal" }}
          />
        )}
      </main>
    </div>
  );
}
