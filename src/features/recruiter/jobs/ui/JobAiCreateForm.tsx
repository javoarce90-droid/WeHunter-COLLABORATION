"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { SparkleIcon } from "@/components/ui/ai";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Field, selectClass } from "./JobForm";
import { MODALITY_LABELS, EMPLOYMENT_LABELS } from "./field-meta";
import type { crearBusquedaConIaAction } from "../actions";

interface JobAiCreateFormProps {
  action: typeof crearBusquedaConIaAction;
}

export function JobAiCreateForm({ action }: JobAiCreateFormProps) {
  const [title, setTitle] = useState("");
  const [modality, setModality] = useState("");
  const [employmentType, setEmploymentType] = useState("");
  const [brief, setBrief] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await action({
        title: title.trim(),
        modality: modality || null,
        employmentType: employmentType || null,
        brief: brief.trim(),
      });
      if (res.error) {
        setError(res.error);
      }
    });
  }

  if (pending) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <span className="inline-flex items-center gap-1.5 text-sm font-bold text-text">
            <SparkleIcon size={16} /> Generando tu búsqueda con IA…
          </span>
          <p className="max-w-sm text-xs text-muted">
            Puede tardar unos segundos. No cierres ni recargues la página.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <div className="flex flex-col gap-4">
          <Input
            label="Puesto a cubrir"
            type="text"
            maxLength={33}
            placeholder="Ej: Sumate a nuestro equipo de Backend"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            autoFocus
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Jornada">
              <select
                value={employmentType}
                onChange={(e) => setEmploymentType(e.target.value)}
                className={selectClass}
              >
                <option value="">Sin jornada</option>
                {Object.entries(EMPLOYMENT_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Modalidad de trabajo">
              <select
                value={modality}
                onChange={(e) => setModality(e.target.value)}
                className={selectClass}
              >
                <option value="">Sin modalidad</option>
                {Object.entries(MODALITY_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Información adicional">
            <textarea
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              rows={4}
              maxLength={500}
              placeholder="Ej: Sueldo estimado, contexto del equipo, lo que tengas…"
              className={selectClass + " resize-y"}
            />
          </Field>

          {error && <p className="text-xs text-danger">{error}</p>}

          <div className="flex items-center gap-3">
            <Button type="button" disabled={!title.trim()} onClick={submit}>
              Crear oferta
            </Button>
            <Link href="/jobs/new" className="text-sm font-semibold text-muted">
              Volver
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
