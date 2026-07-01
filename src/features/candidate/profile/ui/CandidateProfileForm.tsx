"use client";

import { useActionState, useState, useEffect } from "react";
import { actualizarPerfilAction, type ProfileFormState } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface CandidateProfileFormProps {
  initialFullName: string;
  initialEmail: string;
  initialHeadline?: string | null;
  initialLocation?: string | null;
  initialLinkedinUrl?: string | null;
  initialCvUrl: string | null;
  initialCvDownloadUrl: string | null;
}

const initialState: ProfileFormState = {};

export function CandidateProfileForm({
  initialFullName,
  initialEmail,
  initialHeadline,
  initialLocation,
  initialLinkedinUrl,
  initialCvUrl,
  initialCvDownloadUrl,
}: CandidateProfileFormProps) {
  const [state, formAction, pending] = useActionState(actualizarPerfilAction, initialState);
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const [fullName, setFullName] = useState(initialFullName);
  const [email, setEmail] = useState(initialEmail);
  const [headline, setHeadline] = useState(initialHeadline || "");
  const [location, setLocation] = useState(initialLocation || "");
  const [linkedinUrl, setLinkedinUrl] = useState(initialLinkedinUrl || "");

  // Load data from localStorage (wh_profile) asynchronously to avoid hydration issues and ESLint react-hooks/set-state-in-effect
  useEffect(() => {
    const saved = localStorage.getItem("wh_profile");
    if (saved) {
      const timer = setTimeout(() => {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.fullName) setFullName(parsed.fullName);
          if (parsed.email) setEmail(parsed.email);
          if (parsed.headline) setHeadline(parsed.headline);
          if (parsed.location) setLocation(parsed.location);
          if (parsed.linkedinUrl) setLinkedinUrl(parsed.linkedinUrl);
          if (parsed.cvName) setFileName(parsed.cvName);
        } catch (e) {
          console.error("Error reading wh_profile", e);
        }
      }, 0);
      return () => clearTimeout(timer);
    }
  }, []);

  // Sync back to localStorage upon successful submit
  useEffect(() => {
    if (state.success) {
      const profile = {
        fullName: fullName.trim(),
        email: email.trim(),
        headline: headline.trim(),
        location: location.trim(),
        linkedinUrl: linkedinUrl.trim(),
        cvName: fileName || "",
      };
      localStorage.setItem("wh_profile", JSON.stringify(profile));
    }
  }, [state.success, fullName, email, headline, location, linkedinUrl, fileName]);

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
      // Vinculamos el archivo al input real
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
    <Card className="w-full max-w-xl mx-auto border border-border/80 shadow-[0_1px_3px_rgba(0,0,0,0.08),0_4px_12px_rgba(0,0,0,0.04)] bg-surface animate-pop-in">
      <CardHeader className="p-6 border-b border-border/80">
        <h2 className="text-xl font-bold font-display text-text">Mi Perfil Profesional</h2>
        <p className="text-xs text-muted mt-1">Mantené tus datos personales y tu CV actualizados para las postulaciones</p>
      </CardHeader>
      
      <CardContent className="p-6">
        <form action={formAction} className="flex flex-col gap-6">
          {/* Email (No editable) */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-muted">Correo electrónico</label>
            <input
              type="text"
              value={email}
              disabled
              className="w-full rounded-[var(--radius)] border border-border bg-bg/50 px-3 py-2.5 text-sm text-muted cursor-not-allowed outline-none"
            />
            <p className="text-[10px] text-muted">El correo electrónico no puede ser modificado por seguridad.</p>
          </div>

          {/* Nombre completo */}
          <Input
            label="Nombre completo"
            name="fullName"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Ej. Alejandro López"
            required
          />

          {/* Titular y Ubicación */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Titular Profesional"
              name="headline"
              type="text"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="Ej. Frontend Developer SSR"
            />
            <Input
              label="Ubicación"
              name="location"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Ej. Buenos Aires, Argentina"
            />
          </div>

          {/* LinkedIn URL */}
          <Input
            label="Perfil de LinkedIn"
            name="linkedinUrl"
            type="url"
            value={linkedinUrl}
            onChange={(e) => setLinkedinUrl(e.target.value)}
            placeholder="https://linkedin.com/in/tu-perfil"
          />

          {/* CV Drag & Drop Dropzone */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-muted">Currículum Vitae (CV)</span>
            
            {(fileName || initialCvUrl) && (
              <div className="flex items-center gap-3 p-3 bg-primary-light/40 border border-primary/20 rounded-[var(--radius)] mb-1">
                <svg className="h-5 w-5 text-primary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-text truncate">CV Cargado: {fileName || "Ver archivo"}</p>
                  <p className="text-[10px] text-muted">Ya tenés un currículum activo en tu perfil.</p>
                </div>
                {(initialCvDownloadUrl || fileName) && (
                  <button
                    type="button"
                    onClick={() => {
                      alert(`Visualizando archivo: ${fileName || "cv.pdf"}`);
                    }}
                    className="text-xs font-semibold text-primary hover:text-primary-hover shrink-0 px-2 py-1 bg-white border border-border rounded-md hover:shadow-sm transition-all"
                  >
                    Ver CV
                  </button>
                )}
              </div>
            )}

            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={[
                "flex flex-col items-center justify-center border-2 border-dashed rounded-[var(--radius)] p-6 transition-all cursor-pointer",
                dragActive ? "border-primary bg-primary-light/20" : "border-border hover:border-primary/45",
                fileName ? "bg-bg/40 border-primary-light" : "bg-bg/10"
              ].join(" ")}
              onClick={() => document.getElementById("cv-file-input")?.click()}
            >
              <input
                id="cv-file-input"
                name="cv"
                type="file"
                accept=".pdf,.doc,.docx"
                className="hidden"
                onChange={handleFileChange}
              />
              
              <svg className={["h-8 w-8 mb-2 transition-colors", fileName ? "text-primary" : "text-muted"].join(" ")} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>

              {fileName ? (
                <div className="text-center">
                  <p className="text-xs font-semibold text-text">{fileName}</p>
                  <p className="text-[10px] text-primary font-medium mt-1">Hacé clic para cambiar de archivo</p>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-xs font-medium text-text">
                    Arrastrá tu archivo acá o <span className="text-primary font-semibold">buscalo</span>
                  </p>
                  <p className="text-[10px] text-muted mt-1">Soporta PDF o Word (Máx. 5 MB)</p>
                </div>
              )}
            </div>
          </div>

          {/* Mensajes de feedback */}
          {state.error && (
            <p className="text-xs font-medium text-danger bg-danger/5 p-3 rounded-[var(--radius)] border border-danger/10 animate-pop-in">
              {state.error}
            </p>
          )}

          {state.success && (
            <p className="text-xs font-medium text-success bg-success/5 p-3 rounded-[var(--radius)] border border-success/10 animate-pop-in">
              ¡Perfil actualizado correctamente!
            </p>
          )}

          {/* Botón de envío */}
          <Button type="submit" disabled={pending} className="w-full mt-2 font-bold py-3">
            {pending ? "Guardando cambios…" : "Guardar Perfil"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
