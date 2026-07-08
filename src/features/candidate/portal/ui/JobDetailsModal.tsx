"use client";

import { X, MapPin, Briefcase, DollarSign, FileText, Building2, Award, Clock, Users } from "lucide-react";
import { type Job } from "../data/mock-jobs";
import { type PortalApplication, toStepperStage, puedeRetirarPostulacion } from "../domain/gestionar-postulacion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ApplicationStepper } from "./ApplicationStepper";
import { AREA_LABELS, SENIORITY_LABELS, EMPLOYMENT_LABELS } from "@/features/recruiter/jobs/ui/field-meta";
import { JobMarkdown } from "@/features/recruiter/jobs/ui/markdown";

const STEPPER_STAGE_LABEL: Record<ReturnType<typeof toStepperStage>, string> = {
  new: "Postulado",
  screening: "En revisión",
  interview: "Entrevista",
  offer: "Propuesta",
  hired: "Contratado",
  rejected: "Finalizado",
};

interface JobDetailsModalProps {
  job: Job;
  isApplied: boolean;
  onClose: () => void;
  onApply?: () => void;
  application?: PortalApplication;
  onWithdraw?: () => void;
  isWithdrawing?: boolean;
}

export function JobDetailsModal({
  job,
  isApplied,
  onClose,
  onApply,
  application,
  onWithdraw,
  isWithdrawing = false,
}: JobDetailsModalProps) {
  const metadata = [
    { icon: MapPin, label: "Ubicación", value: job.location },
    job.jobArea ? { icon: Building2, label: "Área", value: AREA_LABELS[job.jobArea] } : null,
    { icon: Briefcase, label: "Modalidad", value: job.workplaceType },
    job.seniority
      ? { icon: Award, label: "Seniority", value: SENIORITY_LABELS[job.seniority] }
      : null,
    job.employmentType
      ? { icon: Clock, label: "Jornada", value: EMPLOYMENT_LABELS[job.employmentType] }
      : null,
    job.vacancies
      ? {
          icon: Users,
          label: "Vacantes",
          value: `${job.vacancies} ${job.vacancies === 1 ? "puesto" : "puestos"}`,
        }
      : null,
    job.salary
      ? { icon: DollarSign, label: "Remuneración", value: job.salary, valueClassName: "text-success" }
      : null,
  ].filter((m): m is NonNullable<typeof m> => m !== null);

  const sections = [
    { title: "Objetivos del puesto", body: job.objectives },
    { title: "Responsabilidades", body: job.responsibilities },
    { title: "Requisitos", body: job.requirements },
  ].filter((s): s is { title: string; body: string } => !!s.body?.trim());

  const hasDetails = sections.length > 0 || (job.benefits?.length ?? 0) > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-fade-in" 
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative bg-surface border border-border w-full max-w-2xl max-h-[85vh] rounded-[var(--radius)] shadow-[var(--shadow)] flex flex-col overflow-hidden animate-pop-in z-10">
        {/* Header */}
        <div className="flex justify-between items-start p-6 border-b border-border/60 bg-muted/5">
          <div className="flex flex-col gap-1.5 pr-8">
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">
              {job.company}
            </span>
            <h2 className="text-xl font-bold font-display text-text leading-tight">
              {job.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 -mr-1.5 rounded-xl hover:bg-muted/50 text-muted hover:text-text transition-colors cursor-pointer"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 custom-scrollbar">
          {/* Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-muted/10 border border-border/40 p-4 rounded-[var(--radius)]">
            {metadata.map(({ icon: Icon, label, value, valueClassName }) => (
              <div key={label} className="flex items-center gap-2.5 text-xs text-text">
                <div className="p-1.5 bg-surface border border-border rounded-lg text-muted">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-muted font-medium">{label}</span>
                  <span className={["font-semibold", valueClassName].filter(Boolean).join(" ")}>{value}</span>
                </div>
              </div>
            ))}
          </div>

          {hasDetails ? (
            <>
              {/* Objetivos / Responsabilidades / Requisitos */}
              {sections.map((s) => (
                <div key={s.title} className="flex flex-col gap-2">
                  <h3 className="text-xs font-bold text-text/80 uppercase tracking-wider">{s.title}</h3>
                  <div className="text-sm text-text/80 leading-relaxed bg-muted/5 border border-border/30 p-4 rounded-[var(--radius)]">
                    <JobMarkdown text={s.body} />
                  </div>
                </div>
              ))}

              {/* Beneficios (cards) */}
              {(job.benefits?.length ?? 0) > 0 && (
                <div className="flex flex-col gap-2">
                  <h3 className="text-xs font-bold text-text/80 uppercase tracking-wider">Beneficios</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {job.benefits!.map((b, i) => (
                      <div key={i} className="rounded-[var(--radius)] border border-border/60 bg-bg/40 px-3 py-2.5">
                        <p className="text-xs font-bold text-text">{b.name}</p>
                        {b.description && (
                          <p className="mt-0.5 text-[11px] text-muted leading-relaxed">{b.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-muted">{job.description}</p>
          )}

          {/* Skills */}
          {job.tags.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="text-xs font-bold text-text/80 uppercase tracking-wider">Skills</h3>
              <div className="flex flex-wrap gap-1.5">
                {job.tags.map((tag) => (
                  <Badge key={tag} variant="muted" className="text-xs px-2.5 py-0.5 rounded-md font-medium">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Postulación / Stepper Context Section */}
          {isApplied && application && (
            <div className="mt-4 border-t border-border/60 pt-6 flex flex-col gap-4">
              <div className="flex justify-between items-center bg-muted/10 border border-border/40 p-4 rounded-[var(--radius)]">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-success/10 border border-success/20 rounded-xl text-success">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-text">Postulación Activa</span>
                    <span className="text-[10px] text-muted">Enviado: {new Date(application.appliedAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <Badge variant={toStepperStage(application.stage)} className="text-xs whitespace-nowrap w-fit">
                  {STEPPER_STAGE_LABEL[toStepperStage(application.stage)]}
                </Badge>
              </div>

              {/* Stepper progress */}
              <div className="bg-surface border border-border p-5 rounded-[var(--radius)] shadow-xs">
                <h4 className="text-xs font-bold text-text mb-4">Progreso del Proceso</h4>
                <ApplicationStepper currentStage={toStepperStage(application.stage)} />
              </div>

              {/* Withdrawal action */}
              {onWithdraw && (
                <div className="bg-danger/5 border border-danger/15 p-4 rounded-[var(--radius)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-2">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-bold text-danger">¿Querés retirarte de la búsqueda?</span>
                    <span className="text-[10px] text-muted leading-tight">
                      {puedeRetirarPostulacion(application.stage)
                        ? "Esta acción removerá tu postulación de forma permanente."
                        : "Ya no podés retirarte: el proceso avanzó a la etapa de " +
                          STEPPER_STAGE_LABEL[toStepperStage(application.stage)].toLowerCase() +
                          "."}
                    </span>
                  </div>
                  <Button
                    onClick={onWithdraw}
                    disabled={isWithdrawing || !puedeRetirarPostulacion(application.stage)}
                    variant="secondary"
                    className="border-danger/35 hover:border-danger/55 hover:bg-danger/5 text-danger hover:text-danger active:scale-95 text-xs h-9 py-1 px-4 shrink-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-danger/35 disabled:hover:bg-transparent"
                  >
                    {isWithdrawing ? "Retirando..." : "Retirar Postulación"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer (explorer mode actions) */}
        {!isApplied && onApply && (
          <div className="p-4 border-t border-border/60 bg-muted/5 flex justify-end gap-3 z-10">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="text-xs"
            >
              Cerrar
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={onApply}
              className="text-xs px-6"
            >
              Postularse a esta oferta
            </Button>
          </div>
        )}

        {isApplied && !application && (
          <div className="p-4 border-t border-border/60 bg-muted/5 flex justify-end gap-3 z-10">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="text-xs"
            >
              Cerrar
            </Button>
            <div className="h-10 bg-success/10 text-success border border-success/20 font-semibold text-xs px-4 rounded-[var(--radius)] flex items-center justify-center gap-1.5 select-none">
              ¡Ya te postulaste!
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
