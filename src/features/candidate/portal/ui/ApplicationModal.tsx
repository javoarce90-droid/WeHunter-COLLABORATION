"use client";

import { useState, type DragEvent, type ChangeEvent, useEffect } from "react";
import { type Job } from "../data/mock-jobs";
import { CloudUpload, FileCheck, X, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface ApplicationModalProps {
  job: Job;
  onClose: () => void;
  onSubmit: (data: {
    fullName: string;
    email: string;
    phone: string;
    linkedinUrl?: string;
    cvName: string;
    gdprConsent: boolean;
  }) => void;
}

export function ApplicationModal({
  job,
  onClose,
  onSubmit,
}: ApplicationModalProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [gdprConsent, setGdprConsent] = useState(false);
  const [profileCvName, setProfileCvName] = useState<string | null>(null);
  const [useProfileCv, setUseProfileCv] = useState(true);
  
  // States for CV Upload
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Load data from localStorage (wh_profile) asynchronously to avoid hydration issues and ESLint react-hooks/set-state-in-effect
  useEffect(() => {
    const saved = localStorage.getItem("wh_profile");
    if (saved) {
      const timer = setTimeout(() => {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.fullName) setFullName(parsed.fullName);
          if (parsed.email) setEmail(parsed.email);
          if (parsed.phone) setPhone(parsed.phone);
          if (parsed.linkedinUrl) setLinkedinUrl(parsed.linkedinUrl);
          if (parsed.cvName) {
            setProfileCvName(parsed.cvName);
            setUseProfileCv(true);
          }
        } catch (e) {
          console.error("Error reading wh_profile in modal", e);
        }
      }, 0);
      return () => clearTimeout(timer);
    }
  }, []);

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

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalCvName = cvFile ? cvFile.name : (useProfileCv && profileCvName ? profileCvName : "");

    if (!fullName.trim() || !email.trim() || !phone.trim() || !finalCvName || !gdprConsent) {
      setError("Por favor completá todos los campos obligatorios y adjuntá tu CV.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 1200));

    // Save/update profile in localStorage so it's ready for the next application
    const profile = {
      fullName: fullName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      linkedinUrl: linkedinUrl.trim(),
      cvName: finalCvName,
    };
    localStorage.setItem("wh_profile", JSON.stringify(profile));

    onSubmit({
      fullName,
      email,
      phone,
      linkedinUrl: linkedinUrl.trim() || undefined,
      cvName: finalCvName,
      gdprConsent,
    });
    
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-sidebar/40 backdrop-blur-[4px] animate-fade-in">
      <div className="bg-surface border border-border/60 rounded-2xl w-full max-w-lg shadow-overlay overflow-hidden flex flex-col relative animate-pop-in max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-border/40 flex justify-between items-start bg-muted/10">
          <div className="flex flex-col gap-1 pr-4">
            <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Postulación</span>
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
              <Input
                label="Teléfono *"
                type="tel"
                required
                disabled={isSubmitting}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+54 9 11 1234 5678"
              />
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
                  : profileCvName && useProfileCv
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
              ) : profileCvName && useProfileCv ? (
                <div className="flex flex-col items-center animate-pop-in">
                  <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-1">
                    <FileCheck className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-bold text-text max-w-[200px] text-center truncate">{profileCvName}</span>
                  <span className="text-[11px] font-semibold text-primary mt-0.5">CV de tu perfil • Clic para subir otro</span>
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

          {/* GDPR Consent */}
          <div className="flex items-start gap-3 mt-4 bg-muted/5 p-4 border border-border rounded-[var(--radius)] transition-colors hover:bg-muted/10 cursor-pointer"
               onClick={() => !isSubmitting && setGdprConsent(!gdprConsent)}>
            <div className="flex items-center h-5 mt-0.5">
              <input
                id="gdpr"
                type="checkbox"
                required
                disabled={isSubmitting}
                checked={gdprConsent}
                onChange={(e) => setGdprConsent(e.target.checked)}
                className="w-4 h-4 text-primary bg-bg rounded border-border focus:ring-primary focus:ring-offset-surface cursor-pointer"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <label htmlFor="gdpr" className="text-xs text-text/80 leading-relaxed cursor-pointer select-none" onClick={(e) => e.stopPropagation()}>
              Acepto y doy consentimiento para que <strong className="text-text">{job.company}</strong> procese mi información laboral y currículum para este proceso de selección.
            </label>
          </div>

          {/* Actions Footer */}
          <div className="flex gap-3 justify-end pt-5 mt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
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
          </div>
        </form>
      </div>
    </div>
  );
}
