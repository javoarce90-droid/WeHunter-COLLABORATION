"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { descartarTourAction } from "../actions";

interface Step {
  title: string;
  description: string;
  cta?: { label: string; href: string };
}

const STEPS: Step[] = [
  {
    title: "Bienvenido a WeHunter",
    description:
      "Te acompañamos en los primeros pasos para dejar tu workspace listo para operar.",
  },
  {
    title: "Tu Workspace",
    description:
      "Acá vas a ver el estado general: búsquedas abiertas, candidatos en el pool, postulaciones activas y contrataciones.",
  },
  {
    title: "Creá tu primera búsqueda",
    description:
      "Cargá una búsqueda manualmente o dejá que la IA te ayude a armarla a partir de la descripción del puesto.",
    cta: { label: "Ir a Búsquedas", href: "/jobs" },
  },
  {
    title: "Sumá candidatos a tu Talent Pool",
    description:
      "Cargá candidatos a mano, subí su CV o incorporalos desde las postulaciones que recibas.",
    cta: { label: "Ir a Candidatos", href: "/candidates" },
  },
  {
    title: "Así funciona el pipeline",
    description:
      "Cada búsqueda tiene su propio Kanban: movés candidatos de etapa, dejás notas y agendás entrevistas sin salir de ahí.",
  },
  {
    title: "Tu workspace está listo",
    description:
      "Podés retomar esta guía cuando quieras desde Configuración.",
  },
];

export function OnboardingTour({ onDismiss }: { onDismiss?: () => void }) {
  const [open, setOpen] = useState(true);
  const [stepIndex, setStepIndex] = useState(0);
  const [, startTransition] = useTransition();

  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;

  function dismiss() {
    setOpen(false);
    onDismiss?.();
    startTransition(async () => {
      await descartarTourAction();
    });
  }

  return (
    <Dialog open={open} onClose={dismiss} side="right" title={step.title}>
      <div className="flex h-full flex-col gap-4">
        <p className="text-xs font-semibold text-muted">
          Paso {stepIndex + 1} de {STEPS.length}
        </p>
        <p className="text-sm text-text">{step.description}</p>
        {step.cta && (
          <Link href={step.cta.href}>
            <Button variant="secondary" size="sm">
              {step.cta.label}
            </Button>
          </Link>
        )}
        <div className="mt-auto flex items-center justify-between pt-4">
          <button
            type="button"
            onClick={dismiss}
            className="text-xs font-semibold text-muted hover:text-text"
          >
            Saltear
          </button>
          <div className="flex gap-2">
            {stepIndex > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setStepIndex((i) => i - 1)}>
                Atrás
              </Button>
            )}
            {isLast ? (
              <Button size="sm" onClick={dismiss}>
                Finalizar
              </Button>
            ) : (
              <Button size="sm" onClick={() => setStepIndex((i) => i + 1)}>
                Siguiente
              </Button>
            )}
          </div>
        </div>
      </div>
    </Dialog>
  );
}
