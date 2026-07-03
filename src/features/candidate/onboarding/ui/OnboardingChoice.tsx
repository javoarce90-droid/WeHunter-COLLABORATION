"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SparkleIcon } from "@/components/ui/ai";
import { Button } from "@/components/ui/button";
import { omitirOnboardingAction } from "../actions";

type Choice = "ia" | "manual";

const OPTIONS: { value: Choice; title: string; description: string; icon?: React.ReactNode }[] = [
  {
    value: "ia",
    title: "Completar con IA",
    description: "Pegá tu CV o tu perfil de LinkedIn y armamos un borrador. Vos lo revisás y ajustás.",
    icon: <SparkleIcon size={16} />,
  },
  {
    value: "manual",
    title: "Completar manualmente",
    description: "Completás vos cada campo de tu perfil desde cero.",
  },
];

export function OnboardingChoice() {
  const router = useRouter();
  const [selected, setSelected] = useState<Choice | null>(null);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        {OPTIONS.map((option) => {
          const isSelected = selected === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={isSelected}
              onClick={() => setSelected(option.value)}
              className={[
                "rounded-[var(--radius)] border p-5 text-left transition-colors",
                isSelected
                  ? "border-primary bg-primary-light/40"
                  : "border-border bg-surface hover:border-primary/40",
              ].join(" ")}
            >
              <span className="inline-flex items-center gap-1.5 text-sm font-bold text-text">
                {option.icon}
                {option.title}
              </span>
              <p className="mt-1.5 text-xs text-muted">{option.description}</p>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between">
        <form action={omitirOnboardingAction}>
          <button type="submit" className="text-xs font-semibold text-muted hover:text-text transition-colors">
            Completar después
          </button>
        </form>

        <Button
          type="button"
          disabled={!selected}
          onClick={() => selected && router.push(`/c/onboarding/${selected}`)}
        >
          Continuar
        </Button>
      </div>
    </div>
  );
}
