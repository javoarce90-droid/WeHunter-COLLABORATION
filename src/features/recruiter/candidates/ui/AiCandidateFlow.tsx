"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { SparkleIcon } from "@/components/ui/ai";
import { CandidateForm } from "./CandidateForm";
import {
  generarBorradorCandidatoConIaAction,
  crearCandidatosDesdeCvsAction,
  cargarCandidatoAction,
  type BorradorCandidatoState,
  type CrearCandidatosLoteState,
} from "../actions";
import { AI_BATCH_MAX_CVS } from "../schema";
import type { DraftCandidateProfile } from "@/lib/ai";
import type {
  CandidateWorkExperience,
  CandidateEducation,
  CandidateCertification,
} from "@/db/schema";

const ACCEPT =
  ".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const PROGRESS_MESSAGES = [
  "Leyendo los CVs…",
  "Extrayendo experiencia, educación y skills…",
  "Creando los candidatos en tu pool…",
] as const;

function draftToDefaults(draft: DraftCandidateProfile, cvUrl?: string) {
  const now = new Date();
  const experiences: CandidateWorkExperience[] = draft.workExperiences.map((e, i) => ({
    id: `temp-exp-${i}`,
    profileId: null,
    candidateId: null,
    company: e.company,
    position: e.position,
    startDate: e.startDate,
    endDate: e.endDate,
    description: e.description,
    employmentType: e.employmentType,
    modality: e.modality,
    skills: e.skills.length > 0 ? e.skills : null,
    createdAt: now,
    updatedAt: now,
  }));
  const education: CandidateEducation[] = draft.education.map((e, i) => ({
    id: `temp-edu-${i}`,
    profileId: null,
    candidateId: null,
    institution: e.institution,
    degree: e.degree,
    fieldOfStudy: e.fieldOfStudy,
    startDate: e.startDate,
    endDate: e.endDate,
    description: e.description,
    grade: e.grade,
    activities: e.activities,
    createdAt: now,
    updatedAt: now,
  }));
  const certifications: CandidateCertification[] = draft.certifications.map((c, i) => ({
    id: `temp-cert-${i}`,
    profileId: null,
    candidateId: null,
    name: c.name,
    url: c.url,
    createdAt: now,
    updatedAt: now,
  }));

  return {
    fullName: draft.fullName ?? "",
    email: draft.email ?? "",
    phone: draft.phone,
    headline: draft.headline,
    location: draft.location,
    linkedinUrl: draft.linkedinUrl,
    summary: draft.summary,
    skills: draft.skills,
    hasCv: !!cvUrl,
    existingCvUrl: cvUrl ?? null,
    initialResume: { experiences, education, certifications, languages: [] },
  };
}

export function AiCandidateFlow() {
  const [files, setFiles] = useState<File[]>([]);
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState("");
  const [single, setSingle] = useState<BorradorCandidatoState>({});
  const [batch, setBatch] = useState<CrearCandidatosLoteState>({});
  const [pending, startTransition] = useTransition();
  const [progressStep, setProgressStep] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const isBatch = files.length >= 2;

  useEffect(() => {
    if (!pending || !isBatch) return;
    const t = setInterval(
      () => setProgressStep((s) => Math.min(s + 1, PROGRESS_MESSAGES.length - 1)),
      6000,
    );
    return () => clearInterval(t);
  }, [pending, isBatch]);

  function addFiles(list: FileList | null) {
    if (!list?.length) return;
    setError("");
    setFiles((prev) => {
      const next = [...prev];
      for (const f of Array.from(list)) {
        if (!next.some((p) => p.name === f.name && p.size === f.size)) next.push(f);
      }
      return next.slice(0, AI_BATCH_MAX_CVS);
    });
  }

  function removeFile(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleDrag(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    addFiles(e.dataTransfer.files);
  }

  function submit() {
    if (files.length === 0 && !linkedinUrl.trim()) return;
    setError("");
    const fd = new FormData();
    if (isBatch) {
      files.forEach((f) => fd.append("cvs", f));
      setProgressStep(0);
      startTransition(async () => {
        const res = await crearCandidatosDesdeCvsAction({}, fd);
        setBatch(res);
        if (res.error) setError(res.error);
      });
      return;
    }
    if (files[0]) fd.set("cv", files[0]);
    if (linkedinUrl.trim()) fd.set("linkedinUrl", linkedinUrl.trim());
    startTransition(async () => {
      const res = await generarBorradorCandidatoConIaAction({}, fd);
      setSingle(res);
      if (res.error) setError(res.error);
    });
  }

  // Paso 2 (de a uno): revisar/editar el borrador en el formulario de siempre.
  if (single.draft) {
    return (
      <CandidateForm
        action={cargarCandidatoAction}
        submitLabel="Cargar candidato"
        defaults={draftToDefaults(single.draft, single.cvUrl)}
      />
    );
  }

  // Resultado del lote.
  if (batch.result) {
    const { created, skippedDuplicate, failed } = batch.result;
    return (
      <Card className="mx-auto w-full max-w-xl border border-border bg-surface">
        <CardContent className="flex flex-col gap-5 p-6">
          <div>
            <h2 className="font-display text-lg font-bold tracking-[-0.01em] text-text">
              {created > 0 ? "Listo, candidatos creados" : "No se creó ningún candidato"}
            </h2>
            <p className="mt-1 text-sm text-muted">
              <span className="font-semibold text-text">{created}</span> creado{created !== 1 ? "s" : ""}
              {skippedDuplicate > 0 && ` · ${skippedDuplicate} ya estaban en el pool`}
              {failed.length > 0 && ` · ${failed.length} no se pudieron leer`}
            </p>
          </div>

          {failed.length > 0 && (
            <ul className="flex flex-col gap-2 rounded-[var(--radius)] border border-border bg-bg p-3">
              {failed.map((f) => (
                <li key={f.fileName} className="text-xs text-muted">
                  <span className="font-semibold text-text">{f.fileName}</span> — {f.reason}
                </li>
              ))}
            </ul>
          )}

          <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
            <button
              type="button"
              onClick={() => {
                setBatch({});
                setFiles([]);
              }}
              className="rounded text-sm font-semibold text-muted transition-colors hover:text-text"
            >
              Cargar más
            </button>
            <Link
              href="/candidates"
              className="inline-flex items-center justify-center rounded-[var(--radius)] bg-primary px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
            >
              Ver candidatos
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mx-auto w-full max-w-xl border border-border bg-surface">
      <CardContent className="flex flex-col gap-5 p-6">
        <p className="text-sm text-muted">
          Subí uno o varios CVs y la IA arma el candidato — datos, experiencia, educación y
          certificaciones. Con <span className="font-semibold text-text">un</span> CV lo revisás
          antes de guardar; con <span className="font-semibold text-text">varios</span> se crean
          directo (hasta {AI_BATCH_MAX_CVS} por tanda).
        </p>

        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold text-muted">Currículum (PDF o .docx)</span>

          {files.length > 0 && (
            <ul className="flex flex-col gap-1.5">
              {files.map((f, i) => (
                <li
                  key={`${f.name}-${f.size}`}
                  className="flex items-center gap-3 rounded-[var(--radius)] border border-border bg-bg px-3 py-2"
                >
                  <span className="min-w-0 flex-1 truncate text-xs font-medium text-text">
                    {f.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="shrink-0 text-xs font-semibold text-muted transition-colors hover:text-danger"
                  >
                    Quitar
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={[
              "flex cursor-pointer flex-col items-center justify-center rounded-[var(--radius)] border-2 border-dashed p-6 text-center transition-colors",
              dragActive ? "border-primary bg-primary-light/30" : "border-border hover:border-primary/45",
            ].join(" ")}
          >
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              multiple
              className="hidden"
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <p className="text-xs font-medium text-text">
              Arrastrá los CVs acá o <span className="font-semibold text-primary">buscalos</span>
            </p>
            <p className="mt-1 text-[11px] text-muted">PDF o .docx · hasta 5 MB cada uno</p>
          </div>
        </div>

        {!isBatch && (
          <Input
            label="URL de LinkedIn (opcional)"
            type="text"
            inputMode="url"
            value={linkedinUrl}
            onChange={(e) => setLinkedinUrl(e.target.value)}
            placeholder="linkedin.com/in/…"
          />
        )}

        {isBatch && (
          <p className="rounded-[var(--radius)] border border-border bg-bg px-4 py-3 text-xs text-muted">
            Son {files.length} CVs: se crean sin revisión individual. Los duplicados y los que
            no se puedan leer se saltean y te los reportamos.
          </p>
        )}

        {pending && isBatch && (
          <p className="text-xs text-muted" role="status" aria-live="polite">
            {PROGRESS_MESSAGES[progressStep]} No cierres esta pestaña.
          </p>
        )}

        {error && (
          <p className="rounded-[var(--radius)] border border-danger/20 bg-danger/5 px-3 py-2 text-xs font-medium text-danger">
            {error}
          </p>
        )}

        <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
          <Link
            href="/candidates/new"
            className="rounded text-sm font-semibold text-muted transition-colors hover:text-text"
          >
            Cargar a mano
          </Link>
          <Button
            variant="primary"
            loading={pending}
            disabled={files.length === 0 && !linkedinUrl.trim()}
            onClick={submit}
          >
            <SparkleIcon size={14} />
            {isBatch ? `Crear ${files.length} candidatos` : "Generar con IA"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
