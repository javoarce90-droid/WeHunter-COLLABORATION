"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AiButton, SparkleIcon } from "@/components/ui/ai";
import { CandidateForm } from "./CandidateForm";
import {
  actualizarBorradorCandidatoConIaAction,
  editarCandidatoAction,
  type ActualizarConIaState,
} from "../actions";
import {
  draftExperienceRow,
  draftEducationRow,
  draftCertificationRow,
} from "./draft-resume";
import type { BorradorCombinado } from "../domain/combinar-borrador-candidato";
import type {
  Candidate,
  CandidateWorkExperience,
  CandidateEducation,
  CandidateCertification,
  CandidateLanguage,
} from "@/db/schema";

const ACCEPT =
  ".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

type ExistingResume = {
  experiences: CandidateWorkExperience[];
  education: CandidateEducation[];
  certifications: CandidateCertification[];
  languages: CandidateLanguage[];
};

/** Currículum para el form: lo que ya tenía el candidato (ids reales) + lo que sumó la IA
 *  (ids `temp-…`, que el guardado interpreta como "insertar"). */
function mergedResume(existing: ExistingResume, combinado: BorradorCombinado) {
  const now = new Date();
  return {
    experiences: [
      ...existing.experiences,
      ...combinado.nuevasExperiencias.map((e, i) => draftExperienceRow(e, i, now)),
    ],
    education: [
      ...existing.education,
      ...combinado.nuevaEducacion.map((e, i) => draftEducationRow(e, i, now)),
    ],
    certifications: [
      ...existing.certifications,
      ...combinado.nuevasCertificaciones.map((c, i) => draftCertificationRow(c, i, now)),
    ],
    languages: existing.languages,
  };
}

/**
 * "Actualizar perfil con IA": el recruiter sube un CV nuevo (+ LinkedIn opcional), la IA lo
 * lee y **rellena lo que falta** del candidato que ya existe. Paso 2 = el formulario de
 * edición de siempre, con el merge precargado, para revisar y guardar. Mismo lenguaje visual
 * que "Crear con IA".
 */
export function AiUpdateCandidateFlow({
  candidate,
  resume,
}: {
  candidate: Candidate;
  resume: ExistingResume;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState("");
  const [state, setState] = useState<ActualizarConIaState>({});
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function pickFile(list: FileList | null) {
    if (pending) return;
    const next = list?.[0] ?? null;
    if (next) {
      setFile(next);
      setError("");
    }
  }

  function handleDrag(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (pending) return;
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    pickFile(e.dataTransfer.files);
  }

  function analizar() {
    if (pending || !file) return;
    setError("");
    const fd = new FormData();
    fd.set("cv", file);
    startTransition(async () => {
      const res = await actualizarBorradorCandidatoConIaAction(candidate.id, {}, fd);
      setState(res);
      if (res.error) setError(res.error);
    });
  }

  // La IA no llegó a leer el CV — no hay merge que revisar.
  if (state.extractionFailed) {
    const quota = state.failureReason === "quota";
    return (
      <Card className="mx-auto w-full max-w-xl border border-border bg-surface">
        <CardContent className="flex flex-col gap-4 p-6">
          <div>
            <h2 className="font-display text-lg font-bold tracking-[-0.01em] text-text">
              {quota ? "Se agotó la cuota de IA por hoy" : "La IA no pudo leer este CV"}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {quota
                ? "El plan de IA llegó a su límite de pedidos. Probá de nuevo más tarde, o editá el candidato a mano."
                : "Puede ser un PDF escaneado (imagen), protegido o sin texto seleccionable. Probá con otro archivo, o editá el candidato a mano."}
            </p>
          </div>
          <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
            <Link
              href={`/candidates/${candidate.id}/edit`}
              className="rounded text-sm font-semibold text-muted transition-colors hover:text-text"
            >
              Editar a mano
            </Link>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setState({});
                if (!quota) setFile(null);
                setError("");
              }}
            >
              {quota ? "Reintentar" : "Probar con otro CV"}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Paso 2: revisar el merge en el formulario de edición.
  if (state.combinado) {
    const { campos, aportes } = state.combinado;
    return (
      <div className="flex flex-col gap-5">
        {aportes.length > 0 ? (
          <div className="flex items-start gap-3 rounded-[var(--radius)] border border-primary/25 bg-primary-light/50 px-4 py-3">
            <span className="mt-0.5 shrink-0 text-primary">
              <SparkleIcon size={16} />
            </span>
            <p className="text-sm text-primary-hover">
              La IA completó lo que faltaba: <strong>{aportes.join(", ")}</strong>. Revisá los
              cambios y guardá — no se tocó nada de lo que ya estaba cargado.
            </p>
          </div>
        ) : (
          <div className="rounded-[var(--radius)] border border-border bg-bg px-4 py-3 text-sm text-muted">
            La IA no encontró datos nuevos para sumar: el perfil ya tenía todo lo que trae este
            CV. Podés guardar igual (el CV nuevo queda adjunto) o volver atrás.
          </div>
        )}
        <CandidateForm
          action={editarCandidatoAction}
          submitLabel="Guardar cambios"
          candidateId={candidate.id}
          cancelHref={`/candidates/${candidate.id}`}
          defaults={{
            fullName: candidate.fullName,
            email: campos.email,
            phone: campos.phone,
            headline: campos.headline,
            location: campos.location,
            linkedinUrl: campos.linkedinUrl,
            summary: campos.summary,
            skills: campos.skills,
            seniority: candidate.seniority,
            source: candidate.source,
            hasCv: true,
            existingCvUrl: state.cvUrl ?? null,
            initialResume: mergedResume(resume, state.combinado),
          }}
        />
      </div>
    );
  }

  return (
    <Card className="mx-auto w-full max-w-xl border border-border bg-surface">
      <CardContent className="flex flex-col gap-5 p-6">
        <p className="text-sm text-muted">
          Subí un CV nuevo y la IA completa <span className="font-semibold text-text">solo
          los datos que falten</span> — experiencia, educación, skills, certificaciones. Lo
          que ya está cargado no se toca. Revisás todo antes de guardar.
        </p>

        <fieldset disabled={pending} className="flex flex-col gap-5 disabled:opacity-60">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-muted">Currículum (PDF o .docx)</span>

            {file && (
              <div className="flex items-center gap-3 rounded-[var(--radius)] border border-border bg-bg px-3 py-2">
                <span className="min-w-0 flex-1 truncate text-xs font-medium text-text">
                  {file.name}
                </span>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  disabled={pending}
                  className="shrink-0 text-xs font-semibold text-muted transition-colors hover:text-danger"
                >
                  Quitar
                </button>
              </div>
            )}

            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => !pending && inputRef.current?.click()}
              className={[
                "flex flex-col items-center justify-center rounded-[var(--radius)] border-2 border-dashed p-6 text-center transition-colors",
                pending ? "cursor-not-allowed" : "cursor-pointer",
                dragActive
                  ? "border-primary bg-primary-light/30"
                  : "border-border hover:border-primary/45",
              ].join(" ")}
            >
              <input
                ref={inputRef}
                type="file"
                accept={ACCEPT}
                disabled={pending}
                className="hidden"
                onChange={(e) => {
                  pickFile(e.target.files);
                  e.target.value = "";
                }}
              />
              <p className="text-xs font-medium text-text">
                Arrastrá el CV acá o <span className="font-semibold text-primary">buscalo</span>
              </p>
              <p className="mt-1 text-[11px] text-muted">PDF o .docx · hasta 5 MB</p>
            </div>
          </div>
        </fieldset>

        {error && (
          <p className="rounded-[var(--radius)] border border-danger/20 bg-danger/5 px-3 py-2 text-xs font-medium text-danger">
            {error}
          </p>
        )}

        <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
          <Link
            href={`/candidates/${candidate.id}/edit`}
            className="rounded text-sm font-semibold text-muted transition-colors hover:text-text"
          >
            Editar a mano
          </Link>
          <AiButton onClick={analizar} loading={pending} disabled={!file}>
            Analizar y completar
          </AiButton>
        </div>
      </CardContent>
    </Card>
  );
}
