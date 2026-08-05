"use client";

import { useState, useTransition } from "react";
import { ToggleLeft, Type, Hash, ListChecks, Plus, X, ChevronUp, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { EmptyState } from "@/components/ui/empty-state";
import { AiButton } from "@/components/ui/ai";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/lib/toast";
import { generarPreguntasScreeningAction } from "../actions";
import type { DraftScreeningQuestion } from "@/lib/ai";
import type {
  ScreeningQuestionInput,
  ScreeningQuestionType,
} from "../domain/definir-preguntas-screening";

const MAX_QUESTIONS = 20;

const TYPE_OPTIONS: {
  type: ScreeningQuestionType;
  label: string;
  icon: typeof ToggleLeft;
}[] = [
  { type: "yes_no", label: "Sí / No", icon: ToggleLeft },
  { type: "text", label: "Texto", icon: Type },
  { type: "number", label: "Numérica", icon: Hash },
  { type: "multiple_choice", label: "Opción múltiple", icon: ListChecks },
];

/**
 * Editor visual de preguntas de screening. Controlado: el padre le pasa `questions` + `onChange`
 * y decide qué hacer con ellas (mandarlas en un hidden input desde el JobForm, o guardarlas con
 * una action desde el paso post-creación). Toda la lógica de edición (tipos, opciones, obligatoria)
 * vive acá para que las dos superficies rendericen exactamente lo mismo.
 */
export function ScreeningBuilder({
  questions,
  onChange,
  jobId,
}: {
  questions: ScreeningQuestionInput[];
  onChange: (next: ScreeningQuestionInput[]) => void;
  /** Si viene, habilita "Generar con IA" (necesita el aviso ya guardado del job). */
  jobId?: string;
}) {
  const toast = useToast();
  const [suggestions, setSuggestions] = useState<DraftScreeningQuestion[] | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [aiPending, startAi] = useTransition();

  function generarConIA() {
    if (!jobId) return;
    startAi(async () => {
      const res = await generarPreguntasScreeningAction(jobId);
      if (res.ok && res.questions) {
        setSuggestions(res.questions);
        setSelected(new Set(res.questions.map((_, i) => i)));
      } else {
        toast({ message: res.error ?? "No se pudieron generar preguntas.", variant: "danger" });
      }
    });
  }

  function toggleSuggestion(i: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  function agregarSeleccionadas() {
    if (!suggestions) return;
    const nuevas: ScreeningQuestionInput[] = [...selected]
      .sort((a, b) => a - b)
      .map((i) => {
        const s = suggestions[i]!;
        return {
          type: s.type as ScreeningQuestionType,
          label: s.label,
          options: s.options,
          required: true,
          isCriterion: s.isCriterion,
          expectedValues: s.expectedValues,
          minValue: s.minValue ?? null,
          maxValue: s.maxValue ?? null,
        };
      });

    const espacio = MAX_QUESTIONS - questions.length;
    const aAgregar = nuevas.slice(0, espacio);
    onChange([...questions, ...aAgregar]);
    if (aAgregar.length < nuevas.length) {
      toast({
        message: `Se agregaron ${aAgregar.length} — llegaste al máximo de ${MAX_QUESTIONS} preguntas.`,
      });
    }
    setSuggestions(null);
  }

  const aiHeader = jobId && (
    <div className="flex justify-end">
      <AiButton type="button" disabled={aiPending} onClick={generarConIA}>
        {aiPending ? "Generando…" : "Generar con IA"}
      </AiButton>
    </div>
  );

  const aiDialog = suggestions && (
    <Dialog
      open
      onClose={() => setSuggestions(null)}
      side="center"
      title="Preguntas sugeridas"
      className="max-w-lg"
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted">
          La IA leyó el aviso y sugiere estas preguntas. Elegí cuáles agregar.
        </p>
        <div className="flex max-h-[360px] flex-col gap-2 overflow-y-auto">
          {suggestions.map((s, i) => (
            <label
              key={i}
              className="flex cursor-pointer items-start gap-3 rounded-[var(--radius)] border border-border p-3 hover:bg-bg"
            >
              <Checkbox checked={selected.has(i)} onChange={() => toggleSuggestion(i)} />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-text">{s.label}</p>
                <p className="mt-0.5 text-xs text-muted">
                  {TYPE_OPTIONS.find((t) => t.type === s.type)?.label ?? s.type}
                  {criterionSummary(s) ? ` · ${criterionSummary(s)}` : ""}
                </p>
              </div>
            </label>
          ))}
        </div>
        <div className="flex justify-end gap-3 border-t border-border pt-4">
          <Button type="button" variant="ghost" onClick={() => setSuggestions(null)}>
            Cancelar
          </Button>
          <Button type="button" disabled={selected.size === 0} onClick={agregarSeleccionadas}>
            Agregar {selected.size} pregunta{selected.size !== 1 ? "s" : ""}
          </Button>
        </div>
      </div>
    </Dialog>
  );

  // `required` queda siempre en true: no se ofrece la opción de hacer una pregunta opcional.
  function update(i: number, patch: Partial<ScreeningQuestionInput>) {
    onChange(
      questions.map((q, idx) => (idx === i ? { ...q, ...patch, required: true } : q)),
    );
  }
  function add() {
    onChange([...questions, { type: "yes_no", label: "", required: true }]);
  }
  function remove(i: number) {
    onChange(questions.filter((_, idx) => idx !== i));
  }
  function move(i: number, direction: -1 | 1) {
    const target = i + direction;
    if (target < 0 || target >= questions.length) return;
    const next = [...questions];
    [next[i], next[target]] = [next[target], next[i]];
    onChange(next);
  }
  function changeType(i: number, type: ScreeningQuestionType) {
    update(i, {
      type,
      options: type === "multiple_choice" ? ["", ""] : undefined,
      isCriterion: false,
      expectedValues: undefined,
      minValue: null,
      maxValue: null,
    });
  }

  function toggleCriterion(i: number, isCriterion: boolean) {
    const q = questions[i];
    update(i, {
      isCriterion,
      expectedValues: isCriterion && q.type === "yes_no" ? ["Sí"] : undefined,
      minValue: null,
      maxValue: null,
    });
  }
  function updateOption(qi: number, oi: number, value: string) {
    onChange(
      questions.map((q, idx) => {
        if (idx !== qi) return q;
        const previo = (q.options ?? [])[oi];
        return {
          ...q,
          options: (q.options ?? []).map((o, i) => (i === oi ? value : o)),
          expectedValues: q.expectedValues?.map((e) => (e === previo ? value : e)),
        };
      }),
    );
  }
  function addOption(qi: number) {
    onChange(
      questions.map((q, idx) =>
        idx === qi ? { ...q, options: [...(q.options ?? []), ""] } : q,
      ),
    );
  }
  // Mínimo 2 opciones para que una pregunta de opción múltiple tenga sentido.
  function removeOption(qi: number, oi: number) {
    onChange(
      questions.map((q, idx) => {
        if (idx !== qi || (q.options?.length ?? 0) <= 2) return q;
        const borrada = (q.options ?? [])[oi];
        return {
          ...q,
          options: (q.options ?? []).filter((_, i) => i !== oi),
          expectedValues: q.expectedValues?.filter((e) => e !== borrada),
        };
      }),
    );
  }

  if (questions.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        {aiHeader}
        <EmptyState
          icon={<ListChecks className="h-6 w-6" />}
          title="Todavía no agregaste preguntas"
          description="Las responde el candidato al postularse — te ayudan a conocerlo y filtrar antes de la entrevista. Son opcionales."
          action={{ label: "Agregar primera pregunta", onClick: add }}
        />
        {aiDialog}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {aiHeader}
      {questions.map((q, i) => (
        <div
          key={i}
          className="flex flex-col gap-3 rounded-[var(--radius)] border border-border bg-bg p-4"
        >
          <div className="flex items-start gap-3">
            <span className="mt-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-light text-xs font-bold text-primary-hover tabular-nums">
              {i + 1}
            </span>
            <div className="mt-1.5 flex shrink-0 flex-col gap-0.5">
              <IconButton
                aria-label={`Subir pregunta ${i + 1}`}
                variant="surface"
                size="sm"
                disabled={i === 0}
                onClick={() => move(i, -1)}
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </IconButton>
              <IconButton
                aria-label={`Bajar pregunta ${i + 1}`}
                variant="surface"
                size="sm"
                disabled={i === questions.length - 1}
                onClick={() => move(i, 1)}
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </IconButton>
            </div>
            <div className="flex-1">
              <Input
                aria-label={`Pregunta ${i + 1}`}
                value={q.label}
                onChange={(e) => update(i, { label: e.target.value })}
                placeholder="Ej: ¿Tenés disponibilidad para viajar?"
                maxLength={200}
              />
            </div>
            <IconButton
              aria-label={`Quitar pregunta ${i + 1}${q.label ? `: ${q.label}` : ""}`}
              variant="surface"
              onClick={() => remove(i)}
              className="mt-0.5 hover:border-danger hover:text-danger"
            >
              <X className="h-4 w-4" />
            </IconButton>
          </div>

          {/* Selector de tipo visual */}
          <div className="flex flex-wrap gap-2 pl-9">
            {TYPE_OPTIONS.map(({ type, label, icon: Icon }) => {
              const active = q.type === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => changeType(i, type)}
                  aria-pressed={active}
                  className={[
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold outline-none transition-colors",
                    "focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]",
                    active
                      ? "border-primary bg-primary-light text-primary-hover"
                      : "border-border text-muted hover:border-primary/40 hover:text-text",
                  ].join(" ")}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                  {label}
                </button>
              );
            })}
          </div>

          {q.type === "multiple_choice" && (
            <div className="flex flex-col gap-1.5 pl-9">
              <span className="text-xs font-semibold text-muted">Opciones</span>
              {(q.options ?? []).map((opt, oi) => (
                <div key={oi} className="flex items-center gap-2">
                  <div className="max-w-xs flex-1">
                    <Input
                      aria-label={`Opción ${oi + 1} de la pregunta ${i + 1}`}
                      value={opt}
                      onChange={(e) => updateOption(i, oi, e.target.value)}
                      placeholder={`Opción ${oi + 1}`}
                      maxLength={120}
                    />
                  </div>
                  {(q.options?.length ?? 0) > 2 && (
                    <IconButton
                      aria-label={`Quitar opción ${oi + 1}`}
                      variant="ghost"
                      size="sm"
                      onClick={() => removeOption(i, oi)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </IconButton>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-fit gap-1"
                onClick={() => addOption(i)}
              >
                <Plus className="h-3.5 w-3.5" />
                Agregar opción
              </Button>
            </div>
          )}

          <div className="flex flex-col gap-2 pl-9">
            {q.type !== "text" && (
              <label className="inline-flex w-fit cursor-pointer items-center gap-2 text-sm text-text">
                <Checkbox
                  checked={q.isCriterion ?? false}
                  onChange={(e) => toggleCriterion(i, e.target.checked)}
                />
                Criterio de preselección
                <span className="text-xs text-muted">
                  — cuenta para el indicador &quot;N/M cumplidos&quot;
                </span>
              </label>
            )}

            {q.isCriterion && q.type !== "text" && (
              <CriterionEditor question={q} index={i} onChange={(patch) => update(i, patch)} />
            )}
          </div>
        </div>
      ))}

      {questions.length < MAX_QUESTIONS ? (
        <Button type="button" variant="secondary" className="w-full gap-1.5" onClick={add}>
          <Plus className="h-4 w-4" />
          Agregar pregunta
        </Button>
      ) : (
        <p className="text-center text-xs text-muted">
          Llegaste al máximo de {MAX_QUESTIONS} preguntas.
        </p>
      )}
      {aiDialog}
    </div>
  );
}

function criterionSummary(q: DraftScreeningQuestion): string | null {
  if (!q.isCriterion) return null;
  if (q.type === "number") {
    if (q.minValue != null && q.maxValue != null) return `criterio: entre ${q.minValue} y ${q.maxValue}`;
    if (q.minValue != null) return `criterio: mínimo ${q.minValue}`;
    if (q.maxValue != null) return `criterio: máximo ${q.maxValue}`;
    return "criterio";
  }
  if (q.expectedValues?.length) return `criterio: ${q.expectedValues.join(", ")}`;
  return "criterio";
}

/**
 * Editor de la respuesta esperada de un criterio. La forma depende del tipo de pregunta:
 * elegir entre Sí/No, tildar qué opciones valen, o fijar un rango numérico.
 */
function CriterionEditor({
  question,
  index,
  onChange,
}: {
  question: ScreeningQuestionInput;
  index: number;
  onChange: (patch: Partial<ScreeningQuestionInput>) => void;
}) {
  const esperadas = question.expectedValues ?? [];

  function toggleEsperada(value: string, checked: boolean) {
    onChange({
      expectedValues: checked
        ? [...esperadas, value]
        : esperadas.filter((v) => v !== value),
    });
  }

  return (
    <div className="flex flex-col gap-2 rounded-[var(--radius)] border border-dashed border-border bg-surface p-3">
      <span className="text-xs font-semibold text-label">Se cumple cuando la respuesta es</span>

      {question.type === "yes_no" && (
        <div className="flex gap-4">
          {["Sí", "No"].map((opt) => (
            <label key={opt} className="flex items-center gap-1.5 text-sm text-text">
              <input
                type="radio"
                name={`criterio-${index}`}
                checked={esperadas[0] === opt}
                onChange={() => onChange({ expectedValues: [opt] })}
              />
              {opt}
            </label>
          ))}
        </div>
      )}

      {question.type === "multiple_choice" && (
        <div className="flex flex-col gap-1.5">
          {(question.options ?? []).filter(Boolean).length === 0 ? (
            <p className="text-xs text-muted">Cargá primero las opciones de la pregunta.</p>
          ) : (
            (question.options ?? [])
              .filter(Boolean)
              .map((opt) => (
                <label key={opt} className="flex items-center gap-2 text-sm text-text">
                  <Checkbox
                    checked={esperadas.includes(opt)}
                    onChange={(e) => toggleEsperada(opt, e.target.checked)}
                  />
                  {opt}
                </label>
              ))
          )}
          <span className="text-xs text-muted">
            Cualquiera de las opciones tildadas cumple el criterio.
          </span>
        </div>
      )}

      {question.type === "number" && (
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-28">
            <Input
              type="number"
              label="Mínimo"
              value={question.minValue ?? ""}
              onChange={(e) =>
                onChange({ minValue: e.target.value === "" ? null : Number(e.target.value) })
              }
            />
          </div>
          <div className="w-28">
            <Input
              type="number"
              label="Máximo"
              value={question.maxValue ?? ""}
              onChange={(e) =>
                onChange({ maxValue: e.target.value === "" ? null : Number(e.target.value) })
              }
            />
          </div>
          <span className="pb-2 text-xs text-muted">Con uno de los dos alcanza.</span>
        </div>
      )}
    </div>
  );
}
