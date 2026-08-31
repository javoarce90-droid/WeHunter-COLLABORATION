"use client";

import {
  startTransition,
  useActionState,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AiButton, SparkleIcon } from "@/components/ui/ai";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/lib/toast";
import {
  generarInformeEntrevistaAction,
  editarInformeEntrevistaAction,
  obtenerInformeEntrevistaAction,
} from "../actions";
import {
  RECOMMENDATIONS,
  RECOMMENDATION_LABELS,
  REPORT_FIELD_LABELS,
} from "../schema";
import type { InterviewReportRow, InterviewReportContext } from "../schema";

type Props = {
  interviewId: string;
  candidateName: string;
  open: boolean;
  onClose: () => void;
};

type GenerarState = { ok?: boolean; data?: InterviewReportRow; error?: string };
const initialGenerarState: GenerarState = {};

const listToLines = (xs: string[]) => xs.join("\n");
const linesToList = (text: string) =>
  text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

/**
 * Único punto de entrada del informe de entrevista con IA: pega notas/transcripción → la IA
 * genera el informe de 5 secciones → se edita antes de guardar. Si ya existe un informe para
 * esta entrevista, abre directo en modo edición (no vuelve a pedir notas).
 */
export function InterviewReportDialog({ interviewId, candidateName, open, onClose }: Props) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      side="center"
      title={`Informe de entrevista — ${candidateName}`}
      maxWidthClassName="max-w-3xl"
    >
      {/* `Dialog` mantiene los children montados aunque esté cerrado (el `<dialog>` nativo
       *  solo lo oculta) — condicionar acá el montaje da un estado fresco en cada apertura,
       *  sin necesitar un efecto que resetee el fetch al cerrar. */}
      {open && <DialogBody interviewId={interviewId} onClose={onClose} />}
    </Dialog>
  );
}

type Loaded = { report: InterviewReportRow | null; context: InterviewReportContext | null };

function DialogBody({ interviewId, onClose }: { interviewId: string; onClose: () => void }) {
  const [loaded, setLoaded] = useState<Loaded | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    obtenerInformeEntrevistaAction(interviewId).then((res) => {
      if (!cancelled) setLoaded(res.ok ? res.data : { report: null, context: null });
    });
    return () => {
      cancelled = true;
    };
  }, [interviewId]);

  if (loaded === undefined) {
    return (
      <div className="animate-view-in flex items-center justify-center gap-2 px-4 py-10 text-sm text-muted">
        <Spinner /> Cargando…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {loaded.context && <ContextSummary context={loaded.context} />}
      {loaded.report ? (
        <ReportEditor interviewId={interviewId} report={loaded.report} onSaved={onClose} />
      ) : (
        <GenerateStep
          interviewId={interviewId}
          onGenerated={(report) => setLoaded((prev) => ({ report, context: prev?.context ?? null }))}
        />
      )}
    </div>
  );
}

const contextDateFmt = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

/** Sección 1 del informe ("Datos generales"), campos "Fuente: WeHunter" — solo lectura. */
function ContextSummary({ context }: { context: InterviewReportContext }) {
  const fields: [string, string][] = [
    ["Candidato", context.candidateName],
    ["Puesto", context.jobTitle],
    ["Fecha de la entrevista", contextDateFmt.format(context.interviewDate)],
    ["Entrevistador/a", context.interviewerName],
  ];
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-[var(--radius)] border border-border bg-bg px-4 py-3 sm:grid-cols-4">
      {fields.map(([label, value]) => (
        <div key={label} className="flex flex-col gap-1">
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted">{label}</dt>
          <dd className="truncate text-xs font-medium text-text" title={value}>
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function GenerateStep({
  interviewId,
  onGenerated,
}: {
  interviewId: string;
  onGenerated: (data: InterviewReportRow) => void;
}) {
  const [sourceText, setSourceText] = useState("");
  const [state, formAction, pending] = useActionState(
    generarInformeEntrevistaAction,
    initialGenerarState,
  );

  useEffect(() => {
    if (state.ok && state.data) onGenerated(state.data);
  }, [state, onGenerated]);

  return (
    <form action={formAction} className="animate-view-in flex flex-col gap-3">
      <input type="hidden" name="interviewId" value={interviewId} />
      <p className="text-xs text-muted">
        Pegá tus notas o una transcripción de la entrevista. La IA arma un informe
        estandarizado, que después podés revisar y editar sección por sección antes de guardar.
      </p>
      <Textarea
        name="sourceText"
        value={sourceText}
        onChange={(e) => setSourceText(e.target.value)}
        rows={14}
        placeholder="Notas o transcripción de la entrevista…"
        aria-label="Notas o transcripción de la entrevista"
      />
      {state.error && <p className="text-xs text-danger">{state.error}</p>}
      <div className="flex justify-end">
        <AiButton type="submit" loading={pending}>
          {pending ? "Generando informe…" : "Generar informe IA"}
        </AiButton>
      </div>
    </form>
  );
}

/** Encabezado de sección del informe — separa los grupos de campos sin cajas anidadas. */
function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="border-b border-border pb-2 text-[11px] font-bold uppercase tracking-wide text-label">
      {children}
    </h3>
  );
}

const GENERAL_FIELDS = [
  "ubicacion",
  "estudios",
  "idiomas",
  "ultimaRemuneracion",
  "remuneracionPretendida",
  "disponibilidadIngreso",
  "disponibilidadEntrevistas",
] as const;

function ReportEditor({
  interviewId,
  report,
  onSaved,
}: {
  interviewId: string;
  report: InterviewReportRow;
  onSaved: () => void;
}) {
  const toast = useToast();
  // Texto: un objeto para no tener 11 useState. Las listas se editan como texto (una por línea).
  const [text, setText] = useState<Record<string, string>>(() => ({
    ubicacion: report.ubicacion,
    estudios: report.estudios,
    idiomas: report.idiomas,
    ultimaRemuneracion: report.ultimaRemuneracion,
    remuneracionPretendida: report.remuneracionPretendida,
    disponibilidadIngreso: report.disponibilidadIngreso,
    disponibilidadEntrevistas: report.disponibilidadEntrevistas,
    resumenPerfil: report.resumenPerfil,
    situacionMotivacion: report.situacionMotivacion,
    experienciaRelevante: report.experienciaRelevante,
    stackConocimientos: report.stackConocimientos,
    fortalezas: listToLines(report.fortalezas),
    oportunidadesMejora: listToLines(report.oportunidadesMejora),
    aspectosAValidar: listToLines(report.aspectosAValidar),
  }));
  const [recommendation, setRecommendation] = useState(report.recommendation);
  const [justificacion, setJustificacion] = useState(report.recommendationJustification);
  const set = (k: string) => (e: { target: { value: string } }) =>
    setText((t) => ({ ...t, [k]: e.target.value }));

  const [state, formAction, pending] = useActionState(
    editarInformeEntrevistaAction,
    initialGenerarState,
  );

  useEffect(() => {
    if (state.ok) {
      toast({ message: "Informe guardado.", variant: "success" });
      onSaved();
    } else if (state.error) {
      toast({ message: state.error, variant: "danger" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  function guardar() {
    const fd = new FormData();
    fd.set("interviewId", interviewId);
    for (const [k, v] of Object.entries(text)) {
      if (k === "fortalezas" || k === "oportunidadesMejora" || k === "aspectosAValidar") {
        for (const line of linesToList(v)) fd.append(k, line);
      } else {
        fd.set(k, v);
      }
    }
    fd.set("recommendation", recommendation);
    fd.set("recommendationJustification", justificacion);
    startTransition(() => formAction(fd));
  }

  return (
    <div className="animate-view-in flex flex-col gap-6">
      <div className="flex items-center gap-2 text-xs font-semibold text-ai">
        <SparkleIcon size={13} /> Informe generado con IA — revisá y editá antes de guardar
      </div>

      <section className="flex flex-col gap-4">
        <SectionTitle>Datos generales</SectionTitle>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {GENERAL_FIELDS.map((f) => (
            <Input
              key={f}
              label={REPORT_FIELD_LABELS[f]}
              value={text[f]}
              onChange={set(f)}
            />
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <SectionTitle>Perfil</SectionTitle>
        <Textarea
          label={REPORT_FIELD_LABELS.resumenPerfil}
          value={text.resumenPerfil}
          onChange={set("resumenPerfil")}
          rows={5}
        />
        <Textarea
          label={REPORT_FIELD_LABELS.situacionMotivacion}
          value={text.situacionMotivacion}
          onChange={set("situacionMotivacion")}
          rows={3}
        />
      </section>

      <section className="flex flex-col gap-4">
        <SectionTitle>Experiencia y stack</SectionTitle>
        <Textarea
          label={`${REPORT_FIELD_LABELS.experienciaRelevante} (Markdown)`}
          value={text.experienciaRelevante}
          onChange={set("experienciaRelevante")}
          rows={8}
        />
        <Textarea
          label={`${REPORT_FIELD_LABELS.stackConocimientos} (Markdown)`}
          value={text.stackConocimientos}
          onChange={set("stackConocimientos")}
          rows={3}
        />
      </section>

      <section className="flex flex-col gap-4">
        <SectionTitle>Evaluación</SectionTitle>
        <p className="-mt-2 text-[11px] text-muted">Una por línea.</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Textarea
            label={REPORT_FIELD_LABELS.fortalezas}
            value={text.fortalezas}
            onChange={set("fortalezas")}
            rows={6}
          />
          <Textarea
            label={REPORT_FIELD_LABELS.oportunidadesMejora}
            value={text.oportunidadesMejora}
            onChange={set("oportunidadesMejora")}
            rows={6}
          />
          <Textarea
            label={REPORT_FIELD_LABELS.aspectosAValidar}
            value={text.aspectosAValidar}
            onChange={set("aspectosAValidar")}
            rows={6}
          />
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <SectionTitle>Conclusión</SectionTitle>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[220px_1fr]">
          <Select
            label="Recomendación"
            value={recommendation}
            onChange={(e) => setRecommendation(e.target.value as typeof recommendation)}
          >
            {RECOMMENDATIONS.map((r) => (
              <option key={r} value={r}>
                {RECOMMENDATION_LABELS[r]}
              </option>
            ))}
          </Select>
          <Textarea
            label="Conclusión y justificación"
            value={justificacion}
            onChange={(e) => setJustificacion(e.target.value)}
            rows={4}
          />
        </div>
      </section>

      <div className="flex justify-end border-t border-border pt-4">
        <Button type="button" onClick={guardar} loading={pending}>
          Guardar informe
        </Button>
      </div>
    </div>
  );
}
