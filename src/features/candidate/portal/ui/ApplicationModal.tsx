"use client";

import { useState, type DragEvent, type ChangeEvent, useEffect } from "react";
import { type Job } from "../data/mock-jobs";
import { enviarPostulacionPortal } from "./enviar-postulacion";
import { completarDatosMinimosAction } from "@/features/candidate/profile/actions";
import { CloudUpload, FileCheck, X } from "lucide-react";
import { Input, fieldClasses } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScreeningQuestionFields } from "@/features/candidate/applications/ui/ScreeningQuestionFields";
import { obligatoriasSinResponder } from "@/features/candidate/applications/domain/screening";

// Base de campo compartida — la usa ScreeningQuestionFields (prop).
const fieldClass = fieldClasses();

interface ApplicationModalProps {
  job: Job;
  candidate: {
    fullName: string;
    email: string;
    phone: string;
    location: string;
    cvUrl: string | null;
  };
  needsMinData: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ApplicationModal({
  job,
  candidate,
  needsMinData,
  onClose,
  onSuccess,
}: ApplicationModalProps) {
  const questions = job.screeningQuestions ?? [];
  const hasScreening = questions.length > 0;

  const [step, setStep] = useState<"minimos" | "screening">(
    needsMinData ? "minimos" : "screening",
  );

  const [phone, setPhone] = useState(candidate.phone);
  const [location, setLocation] = useState(candidate.location);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const hasExistingCv = !!candidate.cvUrl;

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const faltantes = obligatoriasSinResponder(questions, answers);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);

  const handleDrag = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setIsDragActive(true);
    else if (e.type === "dragleave") setIsDragActive(false);
  };

  const validateAndSetFile = (file: File) => {
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!allowedTypes.includes(file.type)) {
      setError("El archivo debe ser PDF o Word (.doc/.docx).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("El CV supera el límite de 5 MB.");
      return;
    }
    setCvFile(file);
    setError("");
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) validateAndSetFile(e.dataTransfer.files[0]);
  };

  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) validateAndSetFile(e.target.files[0]);
  };

  const enviarPostulacion = async () => {
    setIsSubmitting(true);
    setError("");
    const result = await enviarPostulacionPortal(job, candidate, answers);
    setIsSubmitting(false);
    if (!result.ok) {
      if (hasScreening) setStep("screening");
      setError(result.error ?? "No se pudo enviar la postulación.");
      return;
    }
    onSuccess();
  };

  const guardarMinimos = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim() || !location.trim()) {
      setError("Completá tu teléfono y ubicación.");
      return;
    }
    if (!cvFile && !hasExistingCv) {
      setError("Cargá tu CV para postularte.");
      return;
    }
    setIsSubmitting(true);
    setError("");

    const formData = new FormData();
    formData.set("phone", phone.trim());
    formData.set("location", location.trim());
    formData.set("hasExistingCv", hasExistingCv ? "true" : "false");
    if (cvFile) formData.set("cv", cvFile);

    const result = await completarDatosMinimosAction({}, formData);
    setIsSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }

    if (hasScreening) {
      setStep("screening");
    } else {
      void enviarPostulacion();
    }
  };

  const stepLabel = needsMinData && hasScreening ? ` · Paso ${step === "minimos" ? "1" : "2"} de 2` : "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-sidebar/40 backdrop-blur-[4px] animate-fade-in">
      <div className="bg-surface border border-border/60 rounded-2xl w-full max-w-lg shadow-overlay overflow-hidden flex flex-col relative animate-pop-in max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-border/40 flex justify-between items-start bg-muted/10">
          <div className="flex flex-col gap-1 pr-4">
            <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
              Postulación{stepLabel}
            </span>
            <h2 className="text-lg font-bold font-display text-text leading-tight">{job.title}</h2>
            <p className="text-xs text-muted font-medium">
              {job.company} • {job.location}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 -mr-1.5 rounded-xl text-muted outline-none transition-colors hover:bg-muted/50 hover:text-text focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
            type="button"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5 custom-scrollbar">
          {error && (
            <div className="text-sm font-medium text-danger bg-danger/10 border border-danger/20 px-4 py-3 rounded-xl flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-danger shrink-0" />
              {error}
            </div>
          )}

          {step === "minimos" ? (
            <form onSubmit={guardarMinimos} className="flex flex-col gap-5">
              <p className="text-xs text-muted">
                Antes de postularte necesitamos algunos datos básicos de tu perfil para que los
                recruiters puedan evaluar tu candidatura. Los guardamos en tu perfil, así no te los
                pedimos de nuevo.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Teléfono *"
                  type="tel"
                  required
                  disabled={isSubmitting}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+54 9 11 1234 5678"
                />
                <Input
                  label="Ubicación *"
                  type="text"
                  required
                  disabled={isSubmitting}
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Ciudad, País"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted">Currículum Vitae (CV) *</label>
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={`relative border-2 border-dashed rounded-[var(--radius)] p-6 transition-all duration-200 flex flex-col items-center justify-center gap-3 cursor-pointer group ${
                    isDragActive
                      ? "border-primary bg-primary/5 scale-[1.02]"
                      : cvFile
                      ? "border-success/40 bg-success/5 hover:border-success/60"
                      : hasExistingCv
                      ? "border-primary/45 bg-primary/5 hover:border-primary/60"
                      : "border-border hover:border-primary/45 bg-bg/10"
                  }`}
                  onClick={() => !isSubmitting && document.getElementById("cv-upload-input")?.click()}
                >
                  <input
                    id="cv-upload-input"
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileInput}
                    disabled={isSubmitting}
                  />

                  {cvFile ? (
                    <div className="flex flex-col items-center animate-pop-in">
                      <div className="w-12 h-12 bg-success/10 text-success rounded-full flex items-center justify-center mb-1">
                        <FileCheck className="w-6 h-6" />
                      </div>
                      <span className="text-sm font-bold text-text max-w-[200px] text-center truncate">
                        {cvFile.name}
                      </span>
                      <span className="text-[11px] font-medium text-muted mt-0.5">
                        {(cvFile.size / 1024 / 1024).toFixed(2)} MB • Clic para cambiar
                      </span>
                    </div>
                  ) : hasExistingCv ? (
                    <div className="flex flex-col items-center animate-pop-in">
                      <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-1">
                        <FileCheck className="w-6 h-6" />
                      </div>
                      <span className="text-sm font-bold text-text max-w-[200px] text-center truncate">
                        CV de tu perfil
                      </span>
                      <span className="text-[11px] font-semibold text-primary mt-0.5">
                        Clic para subir otro
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center pointer-events-none">
                      <div className="w-12 h-12 bg-muted/10 text-muted group-hover:text-primary group-hover:bg-primary/10 transition-colors rounded-full flex items-center justify-center mb-1">
                        <CloudUpload className="w-6 h-6" />
                      </div>
                      <span className="text-sm font-semibold text-text text-center mt-1">
                        Arrastrá tu CV acá o buscalo
                      </span>
                      <span className="text-[11px] font-medium text-muted mt-1">
                        Soporta PDF o Word (.doc, .docx) hasta 5 MB
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
                  Cancelar
                </Button>
                <Button type="submit" variant="primary" loading={isSubmitting} className="min-w-[180px]">
                  {hasScreening ? "Continuar" : "Guardar y postularme"}
                </Button>
              </div>
            </form>
          ) : (
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-4">
                <p className="text-xs text-muted">
                  {job.company} pide responder estas preguntas para esta búsqueda. Las marcadas con{" "}
                  <span className="text-danger">*</span> son obligatorias.
                </p>
                <ScreeningQuestionFields
                  questions={questions}
                  answers={answers}
                  onChange={(id, value) => setAnswers((a) => ({ ...a, [id]: value }))}
                  disabled={isSubmitting}
                  fieldClass={fieldClass}
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={needsMinData ? () => setStep("minimos") : onClose}
                  disabled={isSubmitting}
                >
                  {needsMinData ? "Volver" : "Cancelar"}
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => void enviarPostulacion()}
                  loading={isSubmitting}
                  disabled={faltantes.length > 0}
                  className="min-w-[180px]"
                >
                  Enviar Postulación
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
