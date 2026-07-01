"use client";

import { X, MapPin, Briefcase, DollarSign, FileText } from "lucide-react";
import { type Job } from "../data/mock-jobs";
import { type MockApplication } from "../domain/gestionar-postulacion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ApplicationStepper } from "./ApplicationStepper";

interface JobDetailsModalProps {
  job: Job;
  isApplied: boolean;
  onClose: () => void;
  onApply?: () => void;
  application?: MockApplication;
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
            <div className="flex items-center gap-2.5 text-xs text-text">
              <div className="p-1.5 bg-surface border border-border rounded-lg text-muted">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-muted font-medium">Ubicación</span>
                <span className="font-semibold">{job.location}</span>
              </div>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-text">
              <div className="p-1.5 bg-surface border border-border rounded-lg text-muted">
                <Briefcase className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-muted font-medium">Modalidad</span>
                <span className="font-semibold">{job.workplaceType}</span>
              </div>
            </div>
            {job.salary && (
              <div className="flex items-center gap-2.5 text-xs text-text">
                <div className="p-1.5 bg-surface border border-border rounded-lg text-muted">
                  <DollarSign className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-muted font-medium">Remuneración</span>
                  <span className="font-semibold text-success">{job.salary}</span>
                </div>
              </div>
            )}
          </div>

          {/* Description Section */}
          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-bold text-text/80 uppercase tracking-wider">Descripción del puesto</h3>
            <p className="text-sm text-text/80 leading-relaxed whitespace-pre-line bg-muted/5 border border-border/30 p-4 rounded-[var(--radius)]">
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
                    <span className="text-[10px] text-muted">CV: {application.cvName} • Enviado: {application.appliedAt}</span>
                  </div>
                </div>
                <Badge variant={application.stage} className="text-xs">
                  {application.stage === "new" && "Postulado"}
                  {application.stage === "screening" && "En revisión"}
                  {application.stage === "interview" && "Entrevista"}
                  {application.stage === "offer" && "Propuesta"}
                  {application.stage === "hired" && "Contratado"}
                  {application.stage === "rejected" && "Finalizado"}
                </Badge>
              </div>

              {/* Stepper progress */}
              <div className="bg-surface border border-border p-5 rounded-[var(--radius)] shadow-xs">
                <h4 className="text-xs font-bold text-text mb-4">Progreso del Proceso</h4>
                <ApplicationStepper currentStage={application.stage} />
              </div>

              {/* Withdrawal action */}
              {onWithdraw && (
                <div className="bg-danger/5 border border-danger/15 p-4 rounded-[var(--radius)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-2">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-bold text-danger">¿Querés retirarte de la búsqueda?</span>
                    <span className="text-[10px] text-muted leading-tight">Esta acción removerá tu postulación de forma permanente.</span>
                  </div>
                  <Button
                    onClick={onWithdraw}
                    disabled={isWithdrawing}
                    variant="secondary"
                    className="border-danger/35 hover:border-danger/55 hover:bg-danger/5 text-danger hover:text-danger active:scale-95 text-xs h-9 py-1 px-4 shrink-0"
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
