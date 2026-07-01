"use client";

import { FileText, Search, Video, Award, PartyPopper, XCircle, Check } from "lucide-react";

export type ApplicationStage = "new" | "screening" | "interview" | "offer" | "hired" | "rejected";

interface ApplicationStepperProps {
  currentStage: ApplicationStage;
}

interface Step {
  key: ApplicationStage;
  label: string;
  description: string;
  icon: React.ElementType;
}

const STEPS: Step[] = [
  {
    key: "new",
    label: "Postulado",
    description: "Tu postulación y CV fueron enviados al equipo de selección.",
    icon: FileText,
  },
  {
    key: "screening",
    label: "En revisión",
    description: "Un reclutador está analizando tu perfil y experiencia.",
    icon: Search,
  },
  {
    key: "interview",
    label: "Entrevista",
    description: "Fuiste preseleccionado para una entrevista técnica o de RRHH.",
    icon: Video,
  },
  {
    key: "offer",
    label: "Propuesta",
    description: "El equipo extendió una oferta formal para que te unas.",
    icon: Award,
  },
  {
    key: "hired",
    label: "Contratado",
    description: "¡Felicidades! Completaste con éxito el proceso de contratación.",
    icon: PartyPopper,
  },
];

export function ApplicationStepper({ currentStage }: ApplicationStepperProps) {
  const isRejected = currentStage === "rejected";

  // Encontrar el índice de la etapa actual
  const currentStepIndex = STEPS.findIndex((s) => s.key === currentStage);

  return (
    <div className="flex flex-col gap-6 bg-surface border border-border/60 p-6 rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
      <div className="flex flex-col gap-1.5 pb-2 border-b border-border/40">
        <h4 className="text-sm font-bold font-display text-text">Estado del Proceso</h4>
        <p className="text-xs text-muted font-medium">
          Seguí en tiempo real las etapas de tu candidatura en WeHunter.
        </p>
      </div>

      {isRejected ? (
        <div className="flex items-start gap-4 p-5 bg-danger/5 border border-danger/20 rounded-xl animate-pop-in">
          <div className="p-2.5 bg-danger/10 text-danger rounded-xl shrink-0">
            <XCircle className="w-6 h-6" />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-bold text-danger">Proceso Finalizado</span>
            <p className="text-xs text-text/80 leading-relaxed font-medium">
              Lamentablemente, el equipo decidió no avanzar con tu perfil en esta oportunidad. Agradecemos enormemente tu postulación y tu tiempo, y guardamos tus datos para futuras búsquedas.
            </p>
          </div>
        </div>
      ) : (
        <div className="relative pl-[30px] flex flex-col gap-8 border-l-2 border-border/40 mt-2">
          {STEPS.map((step, idx) => {
            const isCompleted = currentStepIndex >= idx;
            const isCurrent = currentStepIndex === idx;
            const Icon = step.icon;

            return (
              <div key={step.key} className="relative flex flex-col gap-1.5 min-h-[3rem]">
                {/* Indicador de Punto del Stepper */}
                <div
                  className={`absolute -left-[45px] top-0 w-7 h-7 rounded-full border-[2.5px] transition-all duration-300 flex items-center justify-center ${
                    isCurrent
                      ? "border-primary bg-surface shadow-[0_0_0_4px_rgba(var(--primary-rgb),0.15)] ring-offset-2 ring-offset-surface"
                      : isCompleted
                      ? "border-success bg-success"
                      : "border-border/60 bg-surface"
                  }`}
                >
                  {isCompleted && !isCurrent ? (
                    <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                  ) : isCurrent ? (
                    <div className="w-2.5 h-2.5 bg-primary rounded-full animate-pulse" />
                  ) : null}
                </div>

                {/* Info Container */}
                <div className={`flex items-start gap-3 transition-opacity duration-300 ${!isCompleted && !isCurrent ? 'opacity-60' : 'opacity-100'}`}>
                  <div className={`p-2 rounded-lg shrink-0 ${
                    isCurrent ? 'bg-primary/10 text-primary' : 
                    isCompleted ? 'bg-success/10 text-success' : 
                    'bg-muted/10 text-muted'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  
                  <div className="flex flex-col gap-0.5 pt-0.5">
                    <span
                      className={`text-sm font-bold transition-colors ${
                        isCurrent
                          ? "text-primary"
                          : isCompleted
                          ? "text-text"
                          : "text-muted"
                      }`}
                    >
                      {step.label}
                    </span>
                    <p className="text-xs text-muted leading-relaxed font-medium">
                      {step.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
