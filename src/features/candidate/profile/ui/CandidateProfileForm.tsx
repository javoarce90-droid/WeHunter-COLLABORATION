"use client";

import { useActionState, useState } from "react";
import { actualizarPerfilAction, type ProfileFormState } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { SkillsPillsInput } from "./SkillsPillsInput";

interface CandidateProfileFormProps {
  initialFullName: string;
  initialEmail: string;
  initialHeadline?: string | null;
  initialPhone?: string | null;
  initialLocation?: string | null;
  initialLinkedinUrl?: string | null;
  initialSummary?: string | null;
  initialSkills?: string[] | null;
  initialCvUrl: string | null;
  initialCvDownloadUrl: string | null;
  /** Onboarding pasa su propia action (marca candidateOnboardingCompletedAt al guardar). */
  action?: typeof actualizarPerfilAction;
  submitLabel?: string;
  /** /c/profile lo usa dentro de una columna de grid; onboarding lo centra en pantalla completa. */
  wide?: boolean;
  /** Contenido extra dentro del mismo <form>, antes del botón de envío (el onboarding con IA
   * lo usa para el checklist de experiencia/educación/certificaciones extraídas). */
  extraSection?: React.ReactNode;
}

const initialState: ProfileFormState = {};

export function CandidateProfileForm({
  initialFullName,
  initialEmail,
  initialHeadline,
  initialPhone,
  initialLocation,
  initialLinkedinUrl,
  initialSummary,
  initialSkills,
  initialCvUrl,
  initialCvDownloadUrl,
  action = actualizarPerfilAction,
  submitLabel,
  wide = false,
  extraSection,
}: CandidateProfileFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const [email] = useState(initialEmail);
  const [headline, setHeadline] = useState(initialHeadline || "");
  const [phone, setPhone] = useState(initialPhone || "");
  const [location, setLocation] = useState(initialLocation || "");
  const [linkedinUrl, setLinkedinUrl] = useState(initialLinkedinUrl || "");
  const [summary, setSummary] = useState(initialSummary || "");

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

  return (
    <form
      action={formAction}
      className={["flex flex-col gap-6 w-full", wide ? "" : "max-w-xl mx-auto"].join(" ")}
    >
      {/* Card 1: Información Personal */}
      <Card className="w-full border border-border/80 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all duration-200 bg-surface animate-pop-in">
        <CardHeader className="p-5 border-b border-border/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-lg bg-primary-light/60 text-primary">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-text font-display">Información Personal</h3>
              <p className="text-[11px] text-muted">Datos principales de contacto e identificación</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-5 flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {/* Email (No editable) */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-muted">Correo electrónico</label>
              <input
                type="text"
                value={email}
                disabled
                className="w-full rounded-[var(--radius)] border border-border bg-bg/50 px-3 py-2 text-xs text-muted cursor-not-allowed outline-none"
              />
              <p className="text-[10px] text-muted">No editable por seguridad</p>
            </div>

            {/* Nombre completo (No editable) */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-muted">Nombre completo</label>
              <input
                type="text"
                value={initialFullName}
                disabled
                className="w-full rounded-[var(--radius)] border border-border bg-bg/50 px-3 py-2 text-xs text-muted cursor-not-allowed outline-none"
              />
              <p className="text-[10px] text-muted">No editable por seguridad</p>
              <input type="hidden" name="fullName" value={initialFullName} />
            </div>
          </div>

          {/* Titular Profesional y Teléfono */}
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Titular Profesional"
              name="headline"
              type="text"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="Ej. Frontend Developer SSR"
            />
            <Input
              label="Teléfono"
              name="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Ej: +54 9 11 1234 5678"
            />
          </div>

          {/* Ubicación */}
          <Input
            label="Ubicación"
            name="location"
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Ej. Buenos Aires, Argentina"
          />
        </CardContent>
      </Card>

      {/* Card 2: Competencias y Perfil */}
      <Card className="w-full border border-border/80 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all duration-200 bg-surface animate-pop-in [animation-delay:100ms]">
        <CardHeader className="p-5 border-b border-border/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-lg bg-primary-light/60 text-primary">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-text font-display">Competencias y Perfil</h3>
              <p className="text-[11px] text-muted">Skills, resumen profesional y perfil social</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-5 flex flex-col gap-4">
          <Input
            label="Perfil de LinkedIn (opcional)"
            name="linkedinUrl"
            type="text"
            inputMode="url"
            value={linkedinUrl}
            onChange={(e) => setLinkedinUrl(e.target.value)}
            placeholder="linkedin.com/in/tu-perfil"
          />

          <SkillsPillsInput
            name="skills"
            label="Skills / Tecnologías"
            initialSkills={initialSkills ?? []}
            placeholder="Escribí una habilidad y presioná Enter o coma..."
            helpText="Agregá las tecnologías clave de tu perfil."
          />

          <Textarea
            label="Resumen profesional (opcional)"
            name="summary"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Contá brevemente tu trayectoria, fortalezas y lo que buscás…"
            rows={3}
          />
        </CardContent>
      </Card>

      {/* Card 3: CV Dropzone */}
      <Card className="w-full border border-border/80 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all duration-200 bg-surface animate-pop-in [animation-delay:200ms]">
        <CardHeader className="p-5 border-b border-border/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-lg bg-primary-light/60 text-primary">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-text font-display">Currículum Vitae (CV)</h3>
              <p className="text-[11px] text-muted">Archivo PDF o Word (opcional, máx. 5 MB)</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-5 flex flex-col gap-3">
          {(fileName || initialCvUrl) && (
            <div className="flex items-center gap-3 p-3 bg-primary-light/40 border border-primary/20 rounded-[var(--radius)] mb-1">
              <svg className="h-5 w-5 text-primary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-text truncate">
                  {fileName ? `CV Seleccionado: ${fileName}` : "CV Activo Cargado"}
                </p>
                <p className="text-[10px] text-muted">
                  {fileName ? "Listo para guardar con tu perfil" : "Ya tenés un currículum activo en tu perfil."}
                </p>
              </div>
              {initialCvDownloadUrl && !fileName && (
                <a
                  href={initialCvDownloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold text-primary hover:text-primary-hover shrink-0 px-2.5 py-1 bg-white border border-border rounded-md hover:shadow-sm transition-all"
                >
                  Ver CV
                </a>
              )}
            </div>
          )}

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
                  <p className="text-[10px] text-success font-medium">Archivo listo para guardar</p>
                </div>
                <span className="text-[11px] font-semibold text-primary underline hover:text-primary-hover shrink-0">
                  Cambiar
                </span>
              </div>
            ) : (
              <div className="text-center">
                <svg className="mx-auto h-8 w-8 text-muted/70 mb-2 transition-colors group-hover:text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-xs font-medium text-text">
                  Arrastrá tu archivo acá o <span className="text-primary font-semibold">examinar</span>
                </p>
                <p className="text-[10px] text-muted mt-1">Soporta PDF, DOC, DOCX (Hasta 5 MB)</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {extraSection}

      {/* Feedback messages */}
      {state.error && (
        <p className="text-xs font-medium text-danger bg-danger/5 p-3.5 rounded-[var(--radius)] border border-danger/10 animate-pop-in">
          {state.error}
        </p>
      )}

      {state.success && (
        <p className="text-xs font-medium text-success bg-success/5 p-3.5 rounded-[var(--radius)] border border-success/10 animate-pop-in">
          ¡Perfil actualizado correctamente!
        </p>
      )}

      {/* Sticky Action Footer */}
      <div className="sticky bottom-4 z-10 flex items-center justify-between bg-surface/50 backdrop-blur-md border border-border/70 shadow-[0_8px_32px_rgba(0,0,0,0.12)] p-4 rounded-[var(--radius)] transition-all">
        <span className="text-xs text-muted font-medium">
          {pending ? "Guardando datos..." : "Asegurate de guardar tus cambios"}
        </span>
        <Button type="submit" loading={pending} size="default" className="font-bold px-8 py-2.5 shadow-sm">
          {pending ? "Guardando…" : (submitLabel ?? "Guardar Perfil")}
        </Button>
      </div>
    </form>
  );
}
