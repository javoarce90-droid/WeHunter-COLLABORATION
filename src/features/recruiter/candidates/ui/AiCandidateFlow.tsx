"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { SparkleIcon } from "@/components/ui/ai";
import { CandidateForm } from "./CandidateForm";
import { CvBatchProgressDialog } from "./CvBatchProgressDialog";
import {
  generarBorradorCandidatoConIaAction,
  cargarCandidatoAction,
  type BorradorCandidatoState,
} from "../actions";
import { AI_BATCH_MAX_CVS } from "../schema";
import type { DraftCandidateProfile } from "@/lib/ai";
import {
  draftExperienceRow,
  draftEducationRow,
  draftCertificationRow,
} from "./draft-resume";

const ACCEPT =
  ".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function draftToDefaults(draft: DraftCandidateProfile, cvUrl?: string) {
  const now = new Date();
  const experiences = draft.workExperiences.map((e, i) => draftExperienceRow(e, i, now));
  const education = draft.education.map((e, i) => draftEducationRow(e, i, now));
  const certifications = draft.certifications.map((c, i) => draftCertificationRow(c, i, now));

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
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState("");
  const [single, setSingle] = useState<BorradorCandidatoState>({});
  const [batchOpen, setBatchOpen] = useState(false);
  const [batchRun, setBatchRun] = useState(0);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const isBatch = files.length >= 2;

  function addFiles(list: FileList | null) {
    if (pending || !list?.length) return;
    // Snapshot ahora: el `<input>` se limpia (`value = ""`) justo después del onChange, y eso
    // vacía el FileList vivo antes de que corra el updater de `setFiles`.
    const incoming = Array.from(list);
    setError("");
    setFiles((prev) => {
      const next = [...prev];
      for (const f of incoming) {
        if (!next.some((p) => p.name === f.name && p.size === f.size)) next.push(f);
      }
      return next.slice(0, AI_BATCH_MAX_CVS);
    });
  }

  function removeFile(idx: number) {
    if (pending) return;
    setFiles((prev) => prev.filter((_, i) => i !== idx));
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
    addFiles(e.dataTransfer.files);
  }

  function submit() {
    if (pending || files.length === 0) return;
    setError("");
    if (isBatch) {
      setBatchRun((n) => n + 1);
      setBatchOpen(true);
      return;
    }
    const fd = new FormData();
    if (files[0]) fd.set("cv", files[0]);
    if (linkedinUrl.trim()) fd.set("linkedinUrl", linkedinUrl.trim());
    startTransition(async () => {
      const res = await generarBorradorCandidatoConIaAction({}, fd);
      setSingle(res);
      if (res.error) setError(res.error);
    });
  }

  // Paso 2 (de a uno): la IA no llegó a leer el CV — no tiene sentido mostrar un formulario vacío.
  if (single.draft?.extractionFailed) {
    const quota = single.draft.failureReason === "quota";
    return (
      <Card className="mx-auto w-full max-w-xl border border-border bg-surface">
        <CardContent className="flex flex-col gap-4 p-6">
          <div>
            <h2 className="font-display text-lg font-bold tracking-[-0.01em] text-text">
              {quota ? "Se agotó la cuota de IA por hoy" : "La IA no pudo leer este CV"}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {quota
                ? "El plan de IA llegó a su límite de pedidos. Probá de nuevo más tarde, o cargá el candidato a mano."
                : "Puede ser un PDF escaneado (imagen), protegido o sin texto seleccionable. Probá con otro archivo, o cargá el candidato a mano."}
            </p>
          </div>
          <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
            <Link
              href="/candidates/new"
              className="rounded text-sm font-semibold text-muted transition-colors hover:text-text"
            >
              Cargar a mano
            </Link>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setSingle({});
                if (!quota) setFiles([]);
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

  return (
    <>
    <Card className="mx-auto w-full max-w-xl border border-border bg-surface">
      <CardContent className="flex flex-col gap-5 p-6">
        <p className="text-sm text-muted">
          Subí uno o varios CVs y la IA arma el candidato — datos, experiencia, educación y
          certificaciones. Con <span className="font-semibold text-text">un</span> CV lo revisás
          antes de guardar; con <span className="font-semibold text-text">varios</span> se crean
          directo (hasta {AI_BATCH_MAX_CVS} por tanda).
        </p>

        <fieldset disabled={pending} className="flex flex-col gap-5 disabled:opacity-60">
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold text-muted">Currículum (PDF o .docx)</span>

          {files.length > 0 && (
            <ul className="flex flex-col gap-2">
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
                    disabled={pending}
                    className="shrink-0 text-xs font-semibold text-muted transition-colors hover:text-danger disabled:cursor-not-allowed disabled:hover:text-muted"
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
            onClick={() => !pending && inputRef.current?.click()}
            className={[
              "flex flex-col items-center justify-center rounded-[var(--radius)] border-2 border-dashed p-6 text-center transition-colors",
              pending ? "cursor-not-allowed" : "cursor-pointer",
              dragActive ? "border-primary bg-primary-light/30" : "border-border hover:border-primary/45",
            ].join(" ")}
          >
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              multiple
              disabled={pending}
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
            helperText="Suma contexto al CV. No reemplaza el CV — la IA necesita el archivo."
          />
        )}
        </fieldset>

        {isBatch && (
          <p className="rounded-[var(--radius)] border border-border bg-bg px-4 py-3 text-xs text-muted">
            Son {files.length} CVs: se crean sin revisión individual. Los duplicados y los que
            no se puedan leer se saltean y te los reportamos al final.
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
            disabled={files.length === 0}
            onClick={submit}
          >
            <SparkleIcon size={14} />
            {isBatch ? `Crear ${files.length} candidatos` : "Generar con IA"}
          </Button>
        </div>
      </CardContent>
    </Card>

    <CvBatchProgressDialog
      key={batchRun}
      files={files}
      open={batchOpen}
      onClose={() => {
        setBatchOpen(false);
        setFiles([]);
      }}
      onFinished={() => router.refresh()}
    />
    </>
  );
}
