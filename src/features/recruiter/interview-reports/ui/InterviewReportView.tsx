import type { ReactNode } from "react";
import { JobMarkdown } from "@/features/recruiter/jobs/ui/markdown";
import {
  RECOMMENDATION_LABELS,
  type InterviewReportContent,
  type Recommendation,
} from "../schema";

/**
 * Vista de solo lectura del informe de entrevista — se renderiza igual para el recruiter (ficha
 * del candidato) y para el cliente/HM (shortlist compartida). Presentacional puro: no importa
 * nada de servidor, no tiene estado. Los campos "No informado" y las listas vacías se omiten.
 */

export type InterviewReportViewData = InterviewReportContent & {
  recommendation: Recommendation;
  recommendationJustification: string;
  /** Contexto opcional — el recruiter lo tiene siempre; en la shortlist puede venir del header. */
  jobTitle?: string | null;
  interviewerName?: string | null;
  interviewDate?: string | Date | null;
};

const REC_TONE: Record<Recommendation, string> = {
  avanzar: "bg-[#DCFCE7] text-[#166534]",
  continuar_evaluando: "bg-[#FEF3C7] text-[#92400E]",
  no_avanzar: "bg-[#FEE2E2] text-[#991B1B]",
};

const dateFmt = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

const has = (v: string) => v.trim() && v.trim().toLowerCase() !== "no informado";

function Field({ label, value }: { label: string; value: string }) {
  if (!has(value)) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted">{label}</dt>
      <dd className="text-sm font-medium text-text">{value}</dd>
    </div>
  );
}

function Prose({ title, text }: { title: string; text: string }) {
  if (!has(text)) return null;
  return (
    <Section title={title}>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-text/80">{text}</p>
    </Section>
  );
}

function Markdown({ title, text }: { title: string; text: string }) {
  if (!has(text)) return null;
  return (
    <Section title={title}>
      <JobMarkdown text={text} className="text-sm text-text/80" />
    </Section>
  );
}

function List({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <Section title={title}>
      <ul className="list-disc space-y-1 pl-5 text-sm text-text/80">
        {items.map((it) => (
          <li key={it}>{it}</li>
        ))}
      </ul>
    </Section>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-xs font-bold uppercase tracking-wide text-label">{title}</h3>
      {children}
    </section>
  );
}

export function InterviewReportView({ report }: { report: InterviewReportViewData }) {
  const {
    recommendation,
    recommendationJustification,
    jobTitle,
    interviewerName,
    interviewDate,
  } = report;

  const generalTop: [string, string][] = [];
  if (jobTitle) generalTop.push(["Puesto", jobTitle]);
  if (interviewerName) generalTop.push(["Entrevistador/a", interviewerName]);
  if (interviewDate)
    generalTop.push([
      "Fecha de la entrevista",
      dateFmt.format(new Date(interviewDate)),
    ]);

  return (
    <div className="flex flex-col gap-6">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-[var(--radius)] border border-border bg-bg px-4 py-4 sm:grid-cols-3">
        {generalTop.map(([label, value]) => (
          <Field key={label} label={label} value={value} />
        ))}
        <Field label="Ubicación" value={report.ubicacion} />
        <Field label="Estudios" value={report.estudios} />
        <Field label="Idiomas" value={report.idiomas} />
        <Field label="Última remuneración" value={report.ultimaRemuneracion} />
        <Field label="Remuneración pretendida" value={report.remuneracionPretendida} />
        <Field label="Disponibilidad de ingreso" value={report.disponibilidadIngreso} />
        <Field label="Disponibilidad para entrevistas" value={report.disponibilidadEntrevistas} />
      </dl>

      <Prose title="Resumen del perfil" text={report.resumenPerfil} />
      <Prose title="Situación actual y motivación" text={report.situacionMotivacion} />
      <Markdown title="Experiencia profesional relevante" text={report.experienciaRelevante} />
      <Markdown title="Stack y conocimientos" text={report.stackConocimientos} />
      <List title="Fortalezas observadas" items={report.fortalezas} />
      <List title="Oportunidades de mejora" items={report.oportunidadesMejora} />
      <List title="Aspectos a validar" items={report.aspectosAValidar} />

      <Section title="Conclusión">
        <span
          className={`inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${REC_TONE[recommendation]}`}
        >
          {RECOMMENDATION_LABELS[recommendation]}
        </span>
        {has(recommendationJustification) && (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-text/80">
            {recommendationJustification}
          </p>
        )}
      </Section>
    </div>
  );
}
