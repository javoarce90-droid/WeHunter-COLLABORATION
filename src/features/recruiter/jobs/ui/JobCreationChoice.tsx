"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SparkleIcon } from "@/components/ui/ai";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Choice = "ai" | "manual";

const OPTIONS: {
  value: Choice;
  title: string;
  description: string;
  icon?: React.ReactNode;
}[] = [
  {
    value: "ai",
    title: "Crear con IA",
    description:
      "Contale a la IA qué buscás y arma un borrador completo. Vos lo revisás y ajustás.",
    icon: <SparkleIcon size={16} />,
  },
  {
    value: "manual",
    title: "Crear manual",
    description: "Completás vos cada campo de la búsqueda desde cero.",
  },
];

/** Sin `value`: no navegan a ningún lado, solo muestran lo que viene. */
const COMING_SOON_OPTIONS: { title: string; description: string }[] = [
  {
    title: "Cargar archivo",
    description: "Subí un PDF o Word con la descripción del puesto y la IA arma el borrador.",
  },
  {
    title: "Pegar URL",
    description: "Pegá el link de un aviso publicado en otro lado y lo importamos.",
  },
];

export function JobCreationChoice({ clientId }: { clientId?: string }) {
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
        {COMING_SOON_OPTIONS.map((option) => (
          <div
            key={option.title}
            className="cursor-not-allowed rounded-[var(--radius)] border border-border bg-surface p-5 text-left opacity-60"
          >
            <span className="inline-flex items-center gap-1.5 text-sm font-bold text-text">
              {option.title}
              <Badge variant="muted">Próximamente</Badge>
            </span>
            <p className="mt-1.5 text-xs text-muted">{option.description}</p>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <Button
          type="button"
          disabled={!selected}
          onClick={() =>
            selected &&
            router.push(
              `/jobs/new/${selected}${clientId ? `?clientId=${clientId}` : ""}`,
            )
          }
        >
          Continuar
        </Button>
      </div>
    </div>
  );
}
