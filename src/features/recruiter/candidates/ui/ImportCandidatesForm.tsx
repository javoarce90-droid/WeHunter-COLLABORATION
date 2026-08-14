"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  previsualizarImportacionAction,
  importarCandidatosMasivoAction,
  type ImportPreviewState,
  type ImportResultState,
} from "../actions";
import { Button } from "@/components/ui/button";
import { fieldClasses } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

type FieldKey = "fullName" | "email" | "phone" | "location" | "linkedinUrl" | "headline" | "skills";

const MAPPING_FIELDS: { key: FieldKey; label: string; required?: boolean }[] = [
  { key: "fullName", label: "Nombre completo", required: true },
  { key: "email", label: "Email", required: true },
  { key: "phone", label: "Teléfono" },
  { key: "location", label: "Ubicación" },
  { key: "linkedinUrl", label: "LinkedIn" },
  { key: "headline", label: "Titular / puesto actual" },
  { key: "skills", label: "Skills (separadas por coma dentro de la celda)" },
];

// Adivina la columna de cada campo por el nombre del header — así el recruiter no tiene que
// mapear a mano cuando el archivo ya usa nombres obvios ("Nombre", "Email"...).
const GUESS_PATTERNS: Record<FieldKey, RegExp> = {
  fullName: /^(nombre|full ?name|name)/i,
  email: /^(email|correo|e-?mail)/i,
  phone: /^(tel[eé]fono|phone|celular|whats ?app)/i,
  location: /^(ubicaci[oó]n|location|ciudad|city)/i,
  linkedinUrl: /^linkedin/i,
  headline: /^(titular|puesto|headline|cargo|title)/i,
  skills: /^(skills|habilidades|tecnolog[ií]as)/i,
};

function guessMapping(headers: string[]): Partial<Record<FieldKey, string>> {
  const guess: Partial<Record<FieldKey, string>> = {};
  for (const field of MAPPING_FIELDS) {
    const match = headers.find((h) => GUESS_PATTERNS[field.key].test(h.trim()));
    if (match) guess[field.key] = match;
  }
  return guess;
}

const initialPreview: ImportPreviewState = {};
const initialResult: ImportResultState = {};

export function ImportCandidatesForm() {
  const [file, setFile] = useState<File | null>(null);
  const hiddenFileRef = useRef<HTMLInputElement>(null);

  const [previewState, previewAction, previewPending] = useActionState<
    ImportPreviewState,
    FormData
  >((_prev, formData) => previsualizarImportacionAction(_prev, formData), initialPreview);

  const [resultState, importAction, importPending] = useActionState<ImportResultState, FormData>(
    (_prev, formData) => importarCandidatosMasivoAction(_prev, formData),
    initialResult,
  );

  // El segundo form reusa el MISMO archivo que ya se analizó — se copia acá vía DataTransfer
  // (mismo patrón que el drag&drop de CV en CandidateProfileForm) en vez de pedirlo de nuevo.
  useEffect(() => {
    if (!file || !hiddenFileRef.current) return;
    const dt = new DataTransfer();
    dt.items.add(file);
    hiddenFileRef.current.files = dt.files;
  }, [file, previewState]);

  const guess = previewState.headers ? guessMapping(previewState.headers) : {};

  if (resultState.ok) {
    return (
      <Card>
        <CardContent className="flex flex-col gap-4 p-6">
          <h2 className="font-display text-lg font-bold text-text">Importación terminada</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="rounded-[var(--radius)] border border-border bg-bg px-4 py-3">
              <p className="text-xs font-medium text-muted">Importados</p>
              <p className="mt-1 text-xl font-bold text-success">{resultState.imported}</p>
            </div>
            <div className="rounded-[var(--radius)] border border-border bg-bg px-4 py-3">
              <p className="text-xs font-medium text-muted">Con errores</p>
              <p className="mt-1 text-xl font-bold text-danger">{resultState.skipped}</p>
            </div>
          </div>

          {resultState.errors && resultState.errors.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-bold text-text">Filas no importadas</h3>
              <div className="max-h-64 overflow-y-auto rounded-[var(--radius)] border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-bg text-left">
                      <th className="px-3 py-2 text-xs font-semibold text-muted">Fila</th>
                      <th className="px-3 py-2 text-xs font-semibold text-muted">Nombre</th>
                      <th className="px-3 py-2 text-xs font-semibold text-muted">Motivo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {resultState.errors.map((e) => (
                      <tr key={e.row}>
                        <td className="px-3 py-2 tabular-nums text-muted">{e.row}</td>
                        <td className="px-3 py-2 text-text">{e.fullName ?? "—"}</td>
                        <td className="px-3 py-2 text-danger">{e.error}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <Link
              href="/candidates"
              className="inline-flex items-center justify-center rounded-[var(--radius)] bg-primary px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
            >
              Ver candidatos
            </Link>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="text-sm font-semibold text-muted hover:text-text"
            >
              Importar otro archivo
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!previewState.ok) {
    return (
      <Card>
        <CardHeader className="p-6 border-b border-border">
          <h2 className="font-display text-lg font-bold text-text">1. Elegí el archivo</h2>
          <p className="mt-1 text-sm text-muted">
            CSV o Excel (.xlsx), hasta 5 MB. La primera fila debe tener los nombres de columna.{" "}
            <a
              href="/templates/plantilla-candidatos.xlsx"
              download
              className="font-semibold text-primary hover:text-primary-hover underline underline-offset-2"
            >
              Descargar plantilla
            </a>
          </p>
        </CardHeader>
        <CardContent className="p-6">
          <form action={previewAction} className="flex flex-col gap-4">
            <input
              type="file"
              name="file"
              aria-label="Archivo de candidatos"
              accept=".csv,.xlsx,.xls"
              required
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className={fieldClasses()}
            />
            {previewState.error && <p className="text-sm text-danger">{previewState.error}</p>}
            <Button type="submit" disabled={previewPending} className="self-start">
              {previewPending ? "Analizando…" : "Analizar archivo"}
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="p-6 border-b border-border">
        <h2 className="font-display text-lg font-bold text-text">2. Confirmá qué es cada columna</h2>
        <p className="mt-1 text-sm text-muted">
          {previewState.totalRows} fila{previewState.totalRows !== 1 ? "s" : ""} detectada
          {previewState.totalRows !== 1 ? "s" : ""} en el archivo.
        </p>
      </CardHeader>
      <CardContent className="p-6">
        <form action={importAction} className="flex flex-col gap-5">
          <input ref={hiddenFileRef} type="file" name="file" className="hidden" required />

          <div className="grid gap-4 sm:grid-cols-2">
            {MAPPING_FIELDS.map((field) => (
              <label key={field.key} className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-muted">
                  {field.label}
                  {field.required && " *"}
                </span>
                <select
                  name={`map_${field.key}`}
                  defaultValue={guess[field.key] ?? ""}
                  required={field.required}
                  className={fieldClasses()}
                >
                  <option value="">
                    {field.required ? "Elegí una columna…" : "No importar este dato"}
                  </option>
                  {previewState.headers!.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>

          {previewState.sample && previewState.sample.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-bold text-text">Vista previa (primeras filas)</h3>
              <div className="overflow-x-auto rounded-[var(--radius)] border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-bg text-left">
                      {previewState.headers!.map((h) => (
                        <th key={h} className="whitespace-nowrap px-3 py-2 text-xs font-semibold text-muted">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {previewState.sample.map((row, i) => (
                      <tr key={i}>
                        {previewState.headers!.map((h) => (
                          <td key={h} className="whitespace-nowrap px-3 py-2 text-text/80">
                            {row[h] || "—"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {resultState.error && <p className="text-sm text-danger">{resultState.error}</p>}

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={importPending}>
              {importPending ? "Importando…" : `Importar ${previewState.totalRows} candidatos`}
            </Button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="text-sm font-semibold text-muted hover:text-text"
            >
              Elegir otro archivo
            </button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
