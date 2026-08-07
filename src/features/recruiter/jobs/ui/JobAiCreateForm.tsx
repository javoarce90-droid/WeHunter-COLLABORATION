"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [modality, setModality] = useState("");
  const [employmentType, setEmploymentType] = useState("");
  const [brief, setBrief] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // Guard síncrono: `pending` recién bloquea el botón después de un re-render, dejando una
  // ventana para un doble click/tap que dispare `submit()` dos veces (bug: job duplicado).
  const submittingRef = useRef(false);
  // Si el usuario ya navegó a otra pantalla mientras la IA generaba la búsqueda, no lo
  // arrastramos de vuelta acá — la notificación persistente ya le avisa que se creó.
  const mountedRef = useRef(true);
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  function submit() {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setError(null);
    startTransition(async () => {
      try {
        const res = await action({
          title: title.trim(),
          modality: modality || null,
          employmentType: employmentType || null,
          brief: brief.trim(),
        });
        if (res.error) {
          setError(res.error);
          return;
        }
        if (res.jobId && mountedRef.current) {
          router.push(`/jobs/${res.jobId}/screening?created=1`);
        }
      } finally {
        submittingRef.current = false;
      }
    });
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
            <Button type="button" loading={pending} disabled={!title.trim()} onClick={submit}>
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
