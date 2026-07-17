"use client";

import { useState, type DragEvent, type ChangeEvent, useEffect } from "react";
import { type Job } from "../data/mock-jobs";
import { postularEnPortalAction, type PortalApplyState } from "../actions";
import { CloudUpload, FileCheck, X, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScreeningQuestionFields } from "@/features/candidate/applications/ui/ScreeningQuestionFields";
import { obligatoriasSinResponder } from "@/features/candidate/applications/domain/screening";

const fieldClass =
  "w-full rounded-[var(--radius)] border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-[var(--focus-ring)]";

interface ApplicationModalProps {
  job: Job;
  candidate: {
    fullName: string;
    email: string;
    phone: string;
    linkedinUrl: string;
    cvUrl: string | null;
  };
  onClose: () => void;
  onSuccess: () => void;
}

export function ApplicationModal({ job, candidate, onClose, onSuccess }: ApplicationModalProps) {
  const [fullName, setFullName] = useState(candidate.fullName);
  const [email, setEmail] = useState(candidate.email);
  const [phone, setPhone] = useState(candidate.phone);
  const [linkedinUrl, setLinkedinUrl] = useState(candidate.linkedinUrl);
  const [useProfileCv, setUseProfileCv] = useState(!!candidate.cvUrl);

  const [cvFile, setCvFile] = useState<File | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const questions = job.screeningQuestions ?? [];
  const hasScreening = questions.length > 0;
  const [step, setStep] = useState<"perfil" | "screening">("perfil");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const faltantes = obligatoriasSinResponder(questions, answers);

  // Bloquear scroll del body mientras el modal está abierto
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);

  const handleDrag = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
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
    setUseProfileCv(false);
    setError("");
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  // Paso 1: valida los datos del perfil. Si la búsqueda tiene screening, avanza al paso 2 en
  // vez de enviar; si no, envía directo.
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) {
      setError("Por favor completá todos los campos obligatorios.");
      return;
    }
    setError("");
    if (hasScreening) {
      setStep("screening");
      return;
    }
    void enviar();
  };

  const enviar = async () => {
    setIsSubmitting(true);
    setError("");

    const formData = new FormData();
    formData.set("jobId", job.id);
    formData.set("organizationId", job.organizationId);
    formData.set("fullName", fullName.trim());
    formData.set("email", email.trim());
    formData.set("phone", phone.trim());
    if (linkedinUrl.trim()) formData.set("linkedinUrl", linkedinUrl.trim());
    if (cvFile) {
      formData.set("cv", cvFile);
    } else if (candidate.cvUrl) {
      formData.set("existingCvUrl", candidate.cvUrl);
    }
    if (hasScreening) {
      formData.set(
        "screeningAnswers",
        JSON.stringify(
          Object.entries(answers)
            .filter(([, value]) => value.trim())
            .map(([questionId, value]) => ({ questionId, value })),
        ),
      );
    }

    const result: PortalApplyState = await postularEnPortalAction({}, formData);
    setIsSubmitting(false);

    if (!result.ok) {
      // Un rechazo de screening viene del servidor (defensa real); mandamos al paso 2 para
      // que el candidato vea qué le falta.
      if (hasScreening) setStep("screening");
      setError(result.error ?? "No se pudo enviar la postulación.");
      return;
    }

    onSuccess();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-sidebar/40 backdrop-blur-[4px] animate-fade-in">
      <div className="bg-surface border border-border/60 rounded-2xl w-full max-w-lg shadow-overlay overflow-hidden flex flex-col relative animate-pop-in max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-border/40 flex justify-between items-start bg-muted/10">
          <div className="flex flex-col gap-1 pr-4">
            <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
              {hasScreening
                ? `Postulación · Paso ${step === "perfil" ? "1" : "2"} de 2`
                : "Postulación"}
            </span>
            <h2 className="text-lg font-bold font-display text-text leading-tight">
              {job.title}
            </h2>
            <p className="text-xs text-muted font-medium">{job.company} • {job.location}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 -mr-1.5 rounded-xl hover:bg-muted/50 text-muted hover:text-text transition-colors"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-6 flex flex-col gap-5 custom-scrollbar">
          {error && (
            <div className="text-sm font-medium text-danger bg-danger/10 border border-danger/20 px-4 py-3 rounded-xl flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-danger shrink-0" />
              {error}
            </div>
          )}

          {step === "perfil" && (
          <>
          <div className="space-y-4">
            {/* Name input */}
            <Input
              label="Nombre Completo *"
              type="text"
              required
              disabled={isSubmitting}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ej: Alejandro López"
            />

            {/* Grid for Email & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Email *"
                type="email"
                required
                disabled={isSubmitting}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alejandro@ejemplo.com"
              />
              {!candidate.phone && (
                <Input
                  label="Teléfono (opcional)"
                  type="tel"
                  disabled={isSubmitting}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+54 9 11 1234 5678"
                />
              )}
            </div>

            {/* LinkedIn (Opcional) */}
            <Input
              label="Perfil de LinkedIn (Opcional)"
              type="url"
              disabled={isSubmitting}
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
              placeholder="https://linkedin.com/in/tu-perfil"
            />
          </div>

          {/* CV Upload Section */}
          <div className="flex flex-col gap-1.5 mt-2">
            <label className="text-xs font-semibold text-muted">Currículum Vitae (CV) — opcional</label>
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
                  : useProfileCv && candidate.cvUrl
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
                  <span className="text-sm font-bold text-text max-w-[200px] text-center truncate">{cvFile.name}</span>
                  <span className="text-[11px] font-medium text-muted mt-0.5">{(cvFile.size / 1024 / 1024).toFixed(2)} MB • Clic para cambiar</span>
                </div>
              ) : useProfileCv && candidate.cvUrl ? (
                <div className="flex flex-col items-center animate-pop-in">
                  <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-1">
                    <FileCheck className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-bold text-text max-w-[200px] text-center truncate">CV de tu perfil</span>
                  <span className="text-[11px] font-semibold text-primary mt-0.5">Clic para subir otro</span>
                </div>
              ) : (
                <div className="flex flex-col items-center pointer-events-none">
                  <div className="w-12 h-12 bg-muted/10 text-muted group-hover:text-primary group-hover:bg-primary/10 transition-colors rounded-full flex items-center justify-center mb-1">
                    <CloudUpload className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-semibold text-text text-center mt-1">Arrastrá tu CV acá o buscalo</span>
                  <span className="text-[11px] font-medium text-muted mt-1">Soporta PDF o Word (.doc, .docx) hasta 5 MB</span>
                </div>
              )}
            </div>
          </div>

          {/* Aviso de privacidad */}
          <div className="flex items-start gap-3 mt-4 bg-primary/5 p-4 border border-primary/15 rounded-[var(--radius)]">
            <div className="flex items-center h-5 mt-0.5 text-primary shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-xs text-text/80 leading-relaxed">
              Se compartirá con <strong className="text-text">{job.company}</strong> la información que cargaste en Mi Perfil.
            </p>
          </div>
          </>
          )}

          {step === "screening" && (
            <div className="flex flex-col gap-4">
              <p className="text-xs text-muted">
                {job.company} pide responder estas preguntas para esta búsqueda. Las marcadas
                con <span className="text-danger">*</span> son obligatorias.
              </p>
              <ScreeningQuestionFields
                questions={questions}
                answers={answers}
                onChange={(id, value) => setAnswers((a) => ({ ...a, [id]: value }))}
                disabled={isSubmitting}
                fieldClass={fieldClass}
              />
            </div>
          )}

          {/* Actions Footer */}
          <div className="flex gap-3 justify-end pt-5 mt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={step === "screening" ? () => setStep("perfil") : onClose}
              disabled={isSubmitting}
            >
              {step === "screening" ? "Volver" : "Cancelar"}
            </Button>

            {step === "perfil" ? (
              <Button type="submit" variant="primary" disabled={isSubmitting} className="min-w-[180px]">
                {hasScreening ? (
                  "Continuar"
                ) : isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  "Enviar Postulación"
                )}
              </Button>
            ) : (
              <Button
                type="button"
                variant="primary"
                onClick={() => void enviar()}
                disabled={isSubmitting || faltantes.length > 0}
                className="min-w-[180px]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  "Enviar Postulación"
                )}
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
