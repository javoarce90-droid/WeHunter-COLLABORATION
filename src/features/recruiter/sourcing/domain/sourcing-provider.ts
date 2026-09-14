/**
 * Interfaz del proveedor de datos de sourcing (LinkedIn). La app SIEMPRE habla con esta
 * interfaz, nunca con un proveedor concreto — mismo patrón que `AiProvider`
 * (`src/lib/ai/provider.ts`). Hoy detrás hay un `SerperProvider` (Google X-Ray, sin datos
 * estructurados); cuando haya `APIFY_API_TOKEN` se enchufa `HarvestApiProvider` (descubrimiento
 * + enriquecimiento real en una sola llamada) sin tocar el dominio ni la UI.
 *
 * `maxResults`/`exclude` reemplazan el concepto de "página" que usaba Serper: cada proveedor
 * decide internamente cómo conseguir esa cantidad de candidatos nuevos (paginación, variantes
 * de query, cursor propio) — el llamador no necesita saberlo.
 */

export type SourcingFilters = {
  /** Ancla principal — puesto real o título de la búsqueda. */
  role: string;
  skills: string[];
  seniority: string | null;
  /** Ubicación real de la búsqueda, o el default de sourcing si no tiene. */
  location: string;
};

export type ProviderExperience = {
  company: string;
  position: string;
  startDate: string | null;
  endDate: string | null;
  description: string | null;
};

export type ProviderEducation = {
  institution: string;
  degree: string;
  fieldOfStudy: string | null;
  startDate: string | null;
  endDate: string | null;
};

export type ProviderCertification = { name: string; url: string | null };

export type ProviderLanguage = { language: string; level: string | null };

export type SourcingProviderCandidate = {
  id: string; // id sintético/proveedor — NO es un candidate id de WeHunter
  name: string;
  headline: string;
  location: string;
  skills: string[];
  linkedinUrl: string;
  email: string | null;
  snippet: string | null;
  experience: ProviderExperience[];
  education: ProviderEducation[];
  certifications: ProviderCertification[];
  languages: ProviderLanguage[];
};

export type SourcingProviderResult = {
  candidates: SourcingProviderCandidate[];
  isLiveApi: boolean;
  /** Costo real de esta llamada (para el evento de consumo — ver domain/sourcing-consumption-event.ts). */
  costUsd: number;
  error?: string;
};

export interface SourcingProvider {
  /** Una sola llamada, sin continuación entre clicks — "Buscar más candidatos" se eliminó
   *  (design.md §1.1). `exclude` son claves (linkedinUrl/email normalizados) ya presentes en
   *  el Talent Pool del workspace; cada implementación decide cómo evitar devolverlas de
   *  nuevo si puede. Hoy `sourcear-para-busqueda.ts` no tiene forma de conocer esas claves
   *  de antemano (no hay un listado de "todas las URLs del pool"), así que llama con
   *  `exclude: []` y filtra los duplicados DESPUÉS de recibir la respuesta — ver el
   *  requisito "Detección de duplicado contra el Talent Pool" del spec funcional. */
  search(
    filters: SourcingFilters,
    maxResults: number,
    exclude: string[],
  ): Promise<SourcingProviderResult>;
}
