"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FilterChip, FilterChipGroup } from "@/components/ui/filter-chip";
import { SearchInput } from "@/components/ui/search-input";
import { Select } from "@/components/ui/select";
import {
  AGENDA_RANGES,
  AGENDA_RANGE_LABELS,
  DEFAULT_AGENDA_RANGE,
  type AgendaRange,
} from "./agenda-filters";

const SEARCH_DEBOUNCE_MS = 350;

export type AgendaJobOption = { id: string; title: string };

/** Única fuente de verdad de la URL de /agenda — la comparten las chips de rango, el selector
 *  de puesto y el buscador. Omite los valores por defecto. */
export function buildAgendaHref(
  jobId: string | null,
  q: string,
  range: AgendaRange,
): string {
  const params = new URLSearchParams();
  if (jobId) params.set("job", jobId);
  if (q) params.set("q", q);
  if (range !== DEFAULT_AGENDA_RANGE) params.set("range", range);
  return params.size ? `/agenda?${params}` : "/agenda";
}

/** Buscador URL-driven (?q=): sube el texto tipeado con debounce. El caller lo remonta con
 *  `key={query}` cuando el valor cambia por navegación (patrón de `JobsSearchInput`). */
function AgendaSearchInput({
  jobId,
  range,
  initialQuery,
}: {
  jobId: string | null;
  range: AgendaRange;
  initialQuery: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(initialQuery);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  function handleChange(next: string) {
    setValue(next);
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      router.replace(buildAgendaHref(jobId, next.trim(), range), { scroll: false });
    }, SEARCH_DEBOUNCE_MS);
  }

  return (
    <SearchInput
      value={value}
      onChange={handleChange}
      placeholder="Buscar por candidato o búsqueda…"
      aria-label="Buscar entrevistas por candidato o búsqueda"
    />
  );
}

export function AgendaFilters({
  jobOptions,
  jobId,
  query,
  range,
}: {
  jobOptions: AgendaJobOption[];
  jobId: string | null;
  query: string;
  range: AgendaRange;
}) {
  const router = useRouter();

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
      <FilterChipGroup label="Filtrar entrevistas por rango de fechas" wrap={false}>
        {AGENDA_RANGES.map((key) => (
          <FilterChip
            key={key}
            href={buildAgendaHref(jobId, query, key)}
            active={key === range}
          >
            {AGENDA_RANGE_LABELS[key]}
          </FilterChip>
        ))}
      </FilterChipGroup>

      <div className="ml-auto flex flex-wrap items-center gap-3">
        {jobOptions.length >= 2 && (
          <Select
            aria-label="Filtrar entrevistas por búsqueda"
            value={jobId ?? ""}
            onChange={(e) =>
              router.replace(
                buildAgendaHref(e.target.value || null, query, range),
                { scroll: false },
              )
            }
            className="h-10 w-auto max-w-[16rem] shrink-0 !py-2"
          >
            <option value="">Todas las búsquedas</option>
            {jobOptions.map((job) => (
              <option key={job.id} value={job.id}>
                {job.title}
              </option>
            ))}
          </Select>
        )}
        <div className="w-60">
          <AgendaSearchInput
            key={query}
            jobId={jobId}
            range={range}
            initialQuery={query}
          />
        </div>
      </div>
    </div>
  );
}
