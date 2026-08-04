"use client";

import { useActionState, useRef, useState } from "react";
import Link from "next/link";
import type { CandidateFormState } from "../actions";
import { verificarEmailCandidatoAction } from "../actions";
import type { CandidateSource } from "../domain/candidate-details";
import type { VerificarCandidatoPorEmailResult } from "../domain/verificar-candidato-por-email";
import type {
  CandidateWorkExperience,
  CandidateEducation,
  CandidateCertification,
  CandidateLanguage,
} from "@/db/schema";
import { Button } from "@/components/ui/button";
import { Input, fieldClasses } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { CANDIDATE_SOURCE_LABELS } from "./source-meta";
import { SkillsPillsInput } from "@/features/candidate/profile/ui/SkillsPillsInput";
import { CandidateResumeFields } from "./CandidateResumeFields";

type CandidateAction = (
  prev: CandidateFormState,
  formData: FormData,
) => Promise<CandidateFormState>;

interface CandidateFormProps {
  action: CandidateAction;
  submitLabel: string;
  candidateId?: string;
  cancelHref?: string;
  defaults?: {
    fullName?: string;
    email?: string | null;
    phone?: string | null;
    hasCv?: boolean;
    headline?: string | null;
    location?: string | null;
    linkedinUrl?: string | null;
    summary?: string | null;
    skills?: string[] | null;
    source?: CandidateSource | null;
    initialResume?: {
      experiences?: CandidateWorkExperience[];
      education?: CandidateEducation[];
      certifications?: CandidateCertification[];
      languages?: CandidateLanguage[];
    };
  };
}

const selectClass = fieldClasses();
const initialState: CandidateFormState = {};

export function CandidateForm({
  action,
  submitLabel,
  candidateId,
  cancelHref = "/candidates",
  defaults,
}: CandidateFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const confirmDuplicateRef = useRef<HTMLInputElement>(null);
  const linkProfileRef = useRef<HTMLInputElement>(null);
  const skipProfileLinkRef = useRef<HTMLInputElement>(null);

  // Chequeo de email en vivo
  const [liveCheck, setLiveCheck] = useState<VerificarCandidatoPorEmailResult>({});
  const [checkingEmail, setCheckingEmail] = useState(false);
  const lastCheckedEmail = useRef("");

  // Dropzone CV
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  async function onEmailBlur(e: React.FocusEvent<HTMLInputElement>) {
    if (candidateId) return;
    const email = e.currentTarget.value.trim();
    if (!email || email === lastCheckedEmail.current) return;
    lastCheckedEmail.current = email;
    setCheckingEmail(true);
    const result = await verificarEmailCandidatoAction(email);
    setCheckingEmail(false);
    setLiveCheck(result);
  }

  function resubmitWith(ref: React.RefObject<HTMLInputElement | null>) {
    if (ref.current) ref.current.value = "true";
    setLiveCheck({});
    formRef.current?.requestSubmit();
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setFileName(file.name);
      const input = document.getElementById("cv-file-input") as HTMLInputElement;
      if (input) {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        input.files = dataTransfer.files;
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFileName(e.target.files[0].name);
    }
  };

  const shownDuplicate = state.duplicate ?? liveCheck.duplicate;
  const shownProfileMatch = shownDuplicate
    ? undefined
    : (state.profileMatch ?? liveCheck.profileMatch);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-6 w-full">
      {candidateId && <input type="hidden" name="candidateId" value={candidateId} />}
      <input ref={confirmDuplicateRef} type="hidden" name="confirmDuplicate" defaultValue="" />
      <input ref={linkProfileRef} type="hidden" name="linkProfile" defaultValue="" />
      <input ref={skipProfileLinkRef} type="hidden" name="skipProfileLink" defaultValue="" />

      {/* Grid de 2 columnas widescreen alineada */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-start">
        {/* Columna Izquierda: Información Básica + Competencias + CV */}
        <div className="flex flex-col gap-6">
          {/* Card 1: Datos Personales */}
          <Card className="w-full border border-border/80 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all duration-200 bg-surface animate-pop-in">
            <CardHeader className="p-5 border-b border-border/80">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-lg bg-primary-light/60 text-primary">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-bold text-text font-display">Información Personal</h3>
                  <p className="text-[11px] text-muted">Datos principales de contacto de la persona</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-5 flex flex-col gap-4">
              <Input
                label="Nombre completo"
                name="fullName"
                type="text"
                placeholder="Ej: Ada Lovelace"
                defaultValue={defaults?.fullName ?? ""}
                required
                autoFocus
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  label={candidateId ? "Email (opcional)" : "Email"}
                  name="email"
                  type="email"
                  placeholder="ada@ejemplo.com"
                  defaultValue={defaults?.email ?? ""}
                  required={!candidateId}
                  onBlur={onEmailBlur}
                  onChange={() => {
                    lastCheckedEmail.current = "";
                    setLiveCheck({});
                  }}
                />
                <Input
                  label="Teléfono (opcional)"
                  name="phone"
                  type="tel"
                  placeholder="Ej: +54 9 351 555-1234"
                  defaultValue={defaults?.phone ?? ""}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  label="Ubicación (opcional)"
                  name="location"
                  type="text"
                  placeholder="Ej: Córdoba, Argentina"
                  defaultValue={defaults?.location ?? ""}
                />
                <Input
                  label="Titular / puesto actual (opcional)"
                  name="headline"
                  type="text"
                  placeholder="Ej: Frontend Senior @ Acme"
                  defaultValue={defaults?.headline ?? ""}
                />
              </div>

              {checkingEmail && !shownDuplicate && !shownProfileMatch && (
                <p className="-mt-2 text-xs text-muted animate-pulse">Revisando si ya existe…</p>
              )}

              {shownDuplicate ? (
                <div className="rounded-[var(--radius)] border border-warning/40 bg-[#FEF3C7] px-3.5 py-3 text-xs text-[#92400E] animate-pop-in">
                  <p>
                    Ya existe un candidato con ese{" "}
                    {shownDuplicate.matchedBy === "email" ? "email" : "LinkedIn"}:{" "}
                    <strong>{shownDuplicate.fullName}</strong>.
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <Link href={`/candidates/${shownDuplicate.id}`} className="font-semibold underline">
                      Ver candidato existente
                    </Link>
                    <button
                      type="button"
                      onClick={() => resubmitWith(confirmDuplicateRef)}
                      className="font-semibold underline hover:text-[#78350F]"
                    >
                      Es otra persona, crear igual
                    </button>
                  </div>
                </div>
              ) : shownProfileMatch ? (
                <div className="rounded-[var(--radius)] border border-warning/40 bg-[#FEF3C7] px-3.5 py-3 text-xs text-[#92400E] animate-pop-in">
                  <p>Ya existe una cuenta de WeHunter registrada con este email.</p>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => resubmitWith(linkProfileRef)}
                      className="font-semibold underline"
                    >
                      Vincular esa cuenta
                    </button>
                    <button
                      type="button"
                      onClick={() => resubmitWith(skipProfileLinkRef)}
                      className="font-semibold underline"
                    >
                      No vincular, crear igual
                    </button>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {/* Card 2: Habilidades, Redes y Resumen */}
          <Card className="w-full border border-border/80 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all duration-200 bg-surface animate-pop-in [animation-delay:100ms]">
            <CardHeader className="p-5 border-b border-border/80">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-lg bg-primary-light/60 text-primary">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-bold text-text font-display">Competencias y Origen</h3>
                  <p className="text-[11px] text-muted">Skills, resumen profesional y fuente</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-5 flex flex-col gap-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  label="LinkedIn (opcional)"
                  name="linkedinUrl"
                  type="text"
                  inputMode="url"
                  placeholder="linkedin.com/in/…"
                  defaultValue={defaults?.linkedinUrl ?? ""}
                />
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-semibold text-muted">Fuente de reclutamiento (opcional)</span>
                  <select
                    name="source"
                    defaultValue={defaults?.source ?? ""}
                    className={selectClass}
                  >
                    <option value="">Sin especificar</option>
                    {Object.entries(CANDIDATE_SOURCE_LABELS)
                      // "portal" la setea el sistema cuando el candidato se postula solo —
                      // no es una fuente que el recruiter elija al cargarlo a mano.
                      .filter(([v]) => v !== "portal")
                      .map(([v, l]) => (
                        <option key={v} value={v}>
                          {l}
                        </option>
                      ))}
                  </select>
                </label>
              </div>

              <SkillsPillsInput
                name="skills"
                label="Skills / Tecnologías"
                initialSkills={defaults?.skills ?? []}
                placeholder="Escribí una habilidad y presioná Enter o coma..."
                helpText="Agregá las tecnologías clave del candidato."
              />

              <Textarea
                label="Resumen profesional (opcional)"
                name="summary"
                rows={3}
                placeholder="Una síntesis de la trayectoria y fortalezas del candidato…"
                defaultValue={defaults?.summary ?? ""}
              />
            </CardContent>
          </Card>

          {/* Card 3: CV Dropzone */}
          <Card className="w-full border border-border/80 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all duration-200 bg-surface animate-pop-in [animation-delay:200ms]">
            <CardHeader className="p-5 border-b border-border/80">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-lg bg-primary-light/60 text-primary">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-bold text-text font-display">Currículum Vitae (CV)</h3>
                  <p className="text-[11px] text-muted">Archivo PDF o Word (opcional, máx. 5 MB)</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-5">
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={[
                  "flex flex-col items-center justify-center border-2 border-dashed rounded-[var(--radius)] p-6 transition-all duration-200 cursor-pointer",
                  dragActive ? "border-primary bg-primary-light/30 scale-[1.01]" : "border-border hover:border-primary/50 hover:bg-bg/40",
                  fileName ? "bg-success/5 border-success/40" : "bg-bg/10",
                ].join(" ")}
                onClick={() => document.getElementById("cv-file-input")?.click()}
              >
                <input
                  id="cv-file-input"
                  name="cv"
                  type="file"
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden"
                  onChange={handleFileChange}
                />

                {fileName ? (
                  <div className="flex items-center gap-3 text-left w-full p-2 animate-pop-in">
                    <div className="p-2.5 rounded-full bg-success/10 text-success shrink-0">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-text truncate">{fileName}</p>
                      <p className="text-[10px] text-success font-medium">Archivo seleccionado listo para guardar</p>
                    </div>
                    <span className="text-[11px] font-semibold text-primary underline hover:text-primary-hover shrink-0">
                      Cambiar
                    </span>
                  </div>
                ) : defaults?.hasCv ? (
                  <div className="text-center">
                    <div className="mx-auto w-9 h-9 rounded-full bg-primary-light/50 flex items-center justify-center text-primary mb-2">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <p className="text-xs font-semibold text-text">CV activo cargado</p>
                    <p className="text-[10px] text-muted mt-0.5">Arrastrá o seleccioná un archivo solo si querés reemplazarlo</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <svg className="mx-auto h-8 w-8 text-muted/70 mb-2 transition-colors group-hover:text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="text-xs font-medium text-text">
                      Arrastrá el CV en PDF o Word acá, o <span className="text-primary font-semibold">examinar</span>
                    </p>
                    <p className="text-[10px] text-muted mt-1">Soporta PDF, DOC, DOCX (Hasta 5 MB)</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Columna Derecha: Currículum Estructurado (Experiencia, Educación, Certificaciones, Idiomas) */}
        <div className="flex flex-col gap-6">
          <CandidateResumeFields
            initialExperiences={defaults?.initialResume?.experiences}
            initialEducation={defaults?.initialResume?.education}
            initialCertifications={defaults?.initialResume?.certifications}
            initialLanguages={defaults?.initialResume?.languages}
          />
        </div>
      </div>

      {state.error && !shownDuplicate && !shownProfileMatch && (
        <p className="text-xs font-medium text-danger bg-danger/5 p-3.5 rounded-[var(--radius)] border border-danger/10 animate-pop-in">
          {state.error}
        </p>
      )}

      {/* Footer de Acciones Sticky / Flotante (Glassmorphism mas transparente con botones 100% opacos) */}
      <div className="sticky bottom-4 z-10 flex items-center justify-between bg-surface/50 backdrop-blur-md border border-border/70 shadow-[0_8px_32px_rgba(0,0,0,0.12)] p-4 rounded-[var(--radius)] transition-all">
        <Link href={cancelHref} className="text-sm font-semibold text-muted hover:text-text transition-colors">
          Cancelar
        </Link>
        <Button type="submit" loading={pending || checkingEmail} size="default" className="font-bold px-8 py-2.5 shadow-sm">
          {pending ? "Guardando…" : checkingEmail ? "Revisando…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
