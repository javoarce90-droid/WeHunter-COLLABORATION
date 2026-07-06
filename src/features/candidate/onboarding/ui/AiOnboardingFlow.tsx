"use client";

import { useActionState, useState } from "react";
import {
  generarPerfilConIaAction,
  completarOnboardingAction,
  type GenerarPerfilConIaState,
} from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { CandidateProfileForm } from "@/features/candidate/profile/ui/CandidateProfileForm";
import { AiDraftReviewSection } from "./AiDraftReviewSection";

interface AiOnboardingFlowProps {
  fullName: string;
  email: string;
}

const initialState: GenerarPerfilConIaState = {};

export function AiOnboardingFlow({ fullName, email }: AiOnboardingFlowProps) {
  const [state, formAction, pending] = useActionState(generarPerfilConIaAction, initialState);
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");

  if (state.draft) {
    return (
      <CandidateProfileForm
        initialFullName={fullName}
        initialEmail={email}
        initialHeadline={state.draft.headline}
        initialLocation={state.draft.location}
        initialLinkedinUrl={state.draft.linkedinUrl}
        initialSummary={state.draft.summary}
        initialSkills={state.draft.skills}
        initialCvUrl={null}
        initialCvDownloadUrl={null}
        action={completarOnboardingAction}
        submitLabel="Finalizar registro"
        extraSection={
          <AiDraftReviewSection
            workExperiences={state.draft.workExperiences}
            education={state.draft.education}
            certifications={state.draft.certifications}
            linkedinFetchStatus={state.draft.linkedinFetchStatus}
            cvFile={cvFile}
          />
        }
      />
    );
  }

  const validateAndSetFile = (file: File) => {
    if (file.type !== "application/pdf") {
      setFileError("Por ahora este asistente solo acepta CV en PDF. Convertilo a PDF e intentá de nuevo.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFileError("El PDF supera los 5 MB permitidos.");
      return;
    }
    setFileError("");
    setCvFile(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) validateAndSetFile(e.dataTransfer.files[0]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) validateAndSetFile(e.target.files[0]);
  };

  const canSubmit = !pending && (linkedinUrl.trim().length > 0 || !!cvFile);

  return (
    <Card className="w-full max-w-xl mx-auto border border-border/80 bg-surface animate-pop-in">
      <CardContent className="p-6">
        <form action={formAction} className="flex flex-col gap-5">
          <p className="text-xs text-muted -mt-1">
            Ingresá tu LinkedIn y/o subí tu CV en PDF — con al menos uno de los dos armamos tu perfil.
          </p>

          <Input
            label="URL de tu perfil de LinkedIn"
            name="linkedinUrl"
            type="url"
            value={linkedinUrl}
            onChange={(e) => setLinkedinUrl(e.target.value)}
            placeholder="https://www.linkedin.com/in/tu-perfil"
          />

          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-muted">Currículum Vitae (CV) en PDF</span>

            {cvFile && (
              <div className="flex items-center gap-3 p-3 bg-primary-light/40 border border-primary/20 rounded-[var(--radius)]">
                <svg className="h-5 w-5 text-primary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-xs font-semibold text-text truncate flex-1 min-w-0">{cvFile.name}</p>
              </div>
            )}

            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => document.getElementById("ai-cv-file-input")?.click()}
              className={[
                "flex flex-col items-center justify-center border-2 border-dashed rounded-[var(--radius)] p-6 transition-all cursor-pointer",
                dragActive ? "border-primary bg-primary-light/20" : "border-border hover:border-primary/45",
                cvFile ? "bg-bg/40 border-primary-light" : "bg-bg/10",
              ].join(" ")}
            >
              <input
                id="ai-cv-file-input"
                name="cv"
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={handleFileChange}
              />
              <svg className={["h-8 w-8 mb-2 transition-colors", cvFile ? "text-primary" : "text-muted"].join(" ")} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <div className="text-center">
                <p className="text-xs font-medium text-text">
                  Arrastrá tu CV en PDF acá o <span className="text-primary font-semibold">buscalo</span>
                </p>
                <p className="text-[10px] text-muted mt-1">Solo PDF (Máx. 5 MB)</p>
              </div>
            </div>
          </div>

          {(fileError || state.error) && (
            <p className="text-xs font-medium text-danger bg-danger/5 p-3 rounded-[var(--radius)] border border-danger/10">
              {fileError || state.error}
            </p>
          )}

          <Button type="submit" disabled={!canSubmit} className="w-full font-bold py-3">
            {pending ? "Generando tu perfil… puede tardar unos segundos" : "Generar con IA"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
