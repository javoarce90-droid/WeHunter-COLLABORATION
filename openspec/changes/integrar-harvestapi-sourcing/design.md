# Diseño técnico — Sourcing con IA sobre HarvestAPI

**Change:** `integrar-harvestapi-sourcing`
**Estado:** borrador inicial, 2026-09-14 — basado en proposal.md y specs/sourcing-provider/spec.md
(ambos `approved`), más la prueba real contra HarvestAPI (ver proposal.md §3.2-§3.3).

---

## 1. Resumen de arquitectura

```
UI (AiSourcingTab / SourcingIADialog, mismo componente AiJobSourcingResults)
  → actions.ts (sourcearParaBusquedaAction, importarSourcingResultadoAction)
    → domain/sourcear-para-busqueda.ts (orquesta: query → provider.search → dedup → scoring batch)
      → domain/sourcing-provider.ts  ← INTERFACE NUEVA, reemplaza el acceso directo a Serper
        → data/harvest-api-provider.ts   (implementación real, HarvestAPI vía Apify)
        → data/serper-provider.ts        (implementación de reversión, el código actual movido acá)
    → data/candidates.mutations.ts (insertCandidate + nuevo: insertCandidateResume)
    → data/sourcing-profile-cache.{queries,mutations}.ts  ← NUEVO (no pagar dos veces)
```

Principio: `sourcear-para-busqueda.ts` y la UI **no cambian su forma de llamar** — hoy ya
reciben `search` como una dependencia inyectada (`SourcearParaBusquedaDeps.search`). Lo único
que cambia es qué implementación se inyecta. Esto es exactamente el patrón que ya existe para
IA (`AiProvider` / `getAiProvider()`, `src/lib/ai/provider.ts` + `index.ts`).

---

## 1.1 Cambio de producto — sin "Buscar más" (2026-09-14)

**Revierte una asunción del diseño original.** El prototipo validado
(`https://claude.ai/artifact/MkCJ4AvdpCSgnQ8DXZQiPr`) reemplaza la iteración de "Buscar más
candidatos" por: el reclutador elige de antemano cuántos candidatos quiere (stepper 1–10) y
dispara **una sola búsqueda**. Los resultados de la última búsqueda **persisten** por
búsqueda laboral hasta que el reclutador usa **"Limpiar"** (acción nueva, no estaba en el
prototipo). Volver a buscar **reemplaza** los resultados, no los acumula.

Esto elimina de raíz el problema que motivó dejar pendiente el "mecanismo de paginación de
HarvestAPI para 'Buscar más'" (§11 original, grupo 4 de tasks.md) — **ya no hace falta
resolverlo, no hay continuación entre clicks**. Simplifica en cascada:

- `SourcingProvider.search()` ya no necesita expresar "traeme la página siguiente" — una
  llamada, `maxResults` candidatos, listo.
- En `sourcear-para-busqueda.ts`, toda la maquinaria de cursor —
  `SourcingCursor`/`stepToVariantPage`/`MAX_SEARCH_STEPS`/`SEARCH_PAGES_PER_VARIANT`/
  `MAX_STEPS_PER_CLICK`/`mergeSourcingBatch` — **se elimina**, no se adapta. La función pasa a
  ser: recibir `job` + `maxResults` (1–10), armar los filtros una vez, llamar al proveedor una
  vez, dedupear contra el pool, scorear en batch, devolver el resultado. Sin `nextStep`, sin
  `exhausted`.
- `sourcing_search_sessions.attempt` (cursor persistido) deja de tener sentido — la columna
  puede quedar sin usar o retirarse en la migración de este change (decisión de tasks: más
  simple dejarla nullable/deprecated que migrar datos de sesiones viejas, que son caché de
  trabajo descartable).
- Nueva acción **"Limpiar"**: borra/resetea la fila de `sourcing_search_sessions` de esa
  búsqueda, para que el reclutador pueda correr una búsqueda nueva desde cero. La persistencia
  "hasta Limpiar" ya la da gratis el upsert-por-`job_id` que `sourcing_search_sessions` ya
  hace hoy — lo único nuevo es el botón/action que la borra.

**Impacto en lo ya implementado (grupos 1–3 de tasks.md, hechos antes de este cambio)**: la
interface `SourcingProvider` en sí (§2) no cambia de forma — cambia lo que la rodea en
`sourcear-para-busqueda.ts`, que hay que simplificar (no fue tocado a fondo en los grupos 1–3,
solo el tipo `ScoredLinkedInCandidate`). Rehacer esa simplificación es trabajo nuevo, no
descarta lo ya hecho de `SerperProvider`/`get-sourcing-provider.ts`.

---

## 2. Interface `SourcingProvider`

Nuevo archivo `src/features/recruiter/sourcing/domain/sourcing-provider.ts`:

```ts
export type SourcingFilters = {
  /** Ancla principal — puesto real o título de la búsqueda. */
  role: string;
  skills: string[];
  seniority: string | null;
  /** Ubicación real de la búsqueda, o DEFAULT_SOURCING_LOCATION si no tiene. */
  location: string;
};

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

export type ProviderExperience = {
  company: string; position: string;
  startDate: string | null; endDate: string | null;
  description: string | null;
};
export type ProviderEducation = {
  institution: string; degree: string; fieldOfStudy: string | null;
  startDate: string | null; endDate: string | null;
};
export type ProviderCertification = { name: string; url: string | null };
export type ProviderLanguage = { language: string; level: string | null };

export type SourcingProviderResult = {
  candidates: SourcingProviderCandidate[];
  isLiveApi: boolean;
  /** Costo real de esta llamada (para el evento de consumo — ver §7). */
  costUsd: number;
  error?: string;
};

export interface SourcingProvider {
  /** Reemplaza `searchLinkedInCandidates`. Una sola llamada, sin continuación entre clicks
   *  (§1.1 — ya no existe "Buscar más"). `maxResults` es la cantidad que el reclutador eligió
   *  en el stepper (1–10) — HarvestAPI soporta pedir una cantidad exacta de perfiles completos
   *  (`maxItems`). `exclude` son claves (linkedinUrl/email normalizados) ya presentes en el
   *  Talent Pool del workspace — no cuentan para completar `maxResults`; cada implementación
   *  decide cómo evitarlas (filtro server-side si el proveedor lo soporta, o descarte
   *  client-side pidiendo de más — a confirmar en tasks, ver §8). */
  search(
    filters: SourcingFilters,
    maxResults: number,
    exclude: string[],
  ): Promise<SourcingProviderResult>;
}
```

`LinkedInCandidateResult` (hoy en `linkedin-search.ts`) se **reemplaza** por
`SourcingProviderCandidate` en todo el dominio de sourcing — es un cambio de tipo, no una
capa nueva encima. `ScoredLinkedInCandidate` sigue siendo `SourcingProviderCandidate & {score,
summary, breakdown, strengths, redFlags}` (mismo patrón que hoy, `sourcear-para-busqueda.ts:32`).

---

## 3. `HarvestApiProvider` (implementación real)

Nuevo archivo `src/features/recruiter/sourcing/data/harvest-api-provider.ts`.

- Actor de Apify: **`harvestapi/linkedin-profile-search`** (confirmado — no usar
  `-by-services`, `-by-name` ni `linkedin-profile-scraper`, son actores distintos).
- Endpoint: `POST https://api.apify.com/v2/acts/harvestapi~linkedin-profile-search/run-sync-get-dataset-items?token=<APIFY_API_TOKEN>`.
- **Siempre `profileScraperMode: "Full"`** — la spec funcional exige descubrimiento +
  enriquecimiento en una sola llamada (§ "Descubrimiento y enriquecimiento en una sola
  llamada"); no se usa el modo `Short` en producción, se usó solo para el diagnóstico de
  facturación (proposal.md §3.2).
- `maxItems: maxResults` — pedir exactamente la cantidad de perfiles nuevos que hacen falta
  (hoy hasta `SOURCING_MAX_RESULTS = 10` por click), no una página fija de 25. Esto es más
  preciso en costo que el esquema actual de Serper.
- Filtros estructurados desde `SourcingFilters`: `currentJobTitles: [filters.role]`,
  `locations: [filters.location]`, más `searchQuery` con los skills si el actor lo admite
  como término adicional (confirmar en tasks el campo exacto para "skills" — no estaba en el
  resumen de input schema relevado; puede ir dentro de `searchQuery` como texto libre
  complementario a los filtros duros).
- `costUsd = 0.10 + maxItems * 0.004` (fee de página + perfiles completos) — usarlo para el
  evento de consumo (§7). *(Nota: si `maxItems` cruza el borde de una página de 25, el fee de
  página se paga más de una vez — el diseño técnico de tasks debe redondear/loguear el costo
  real que devuelve Apify, no solo estimarlo, para que el "costo real" del registro de
  auditoría — ver `limitar-sourcing-ia`, requisito "Registro de consumo y costo real" — sea
  exacto y no una aproximación.)*
- Mapeo de la respuesta: `linkedinUrl` (real, confirmado en la prueba — `/in/publicIdentifier`),
  `location`, `skills`/`topSkills`, `experience`, `education`, `certifications`, `languages`,
  `emails` (array — tomar el primero no vacío, o `null`).
- **Endorsements**: fuera de alcance (spec §"Descubrimiento..."), el campo de la respuesta se
  ignora explícitamente al mapear — no se guarda en ningún lado.
- Sin `APIFY_API_TOKEN` configurado → mismo criterio que hoy con Serper: cae a un fallback
  determinístico (reusar/adaptar `DEMO_PROFILES` de `linkedin-search.ts`) para que dev/demo
  sigan funcionando sin cuenta real.

---

## 4. `SerperProvider` (plan de reversión)

Mover el contenido actual de `linkedin-search.ts` (`searchLinkedInCandidates`,
`buildLinkedInXRayQuery`, `inferGoogleCountryCode`, `DEMO_PROFILES`) a
`src/features/recruiter/sourcing/data/serper-provider.ts`, implementando la misma interface
`SourcingProvider`. Sin datos de experiencia/educación/certificaciones/idiomas reales (Serper
nunca los tuvo) — esos campos quedan en `[]` cuando corre esta implementación. La ubicación
sigue siendo el placeholder actual (`"Ubicación en LinkedIn"`) solo en este modo de reversión
— la spec exige datos reales, pero eso aplica al modo normal (HarvestAPI); en modo reversión
de emergencia el producto ya asume ese techo (es el comportamiento de hoy, no una regresión).

---

## 5. Selección de proveedor

`src/features/recruiter/sourcing/domain/get-sourcing-provider.ts`, mismo patrón que
`getAiProvider()`:

```ts
let instance: SourcingProvider | null = null;

export function getSourcingProvider(): SourcingProvider {
  if (!instance) {
    const forceSerper = process.env.SOURCING_PROVIDER === "serper"; // flag de reversión
    const apifyToken = process.env.APIFY_API_TOKEN;
    instance = !forceSerper && apifyToken
      ? new HarvestApiProvider(apifyToken)
      : new SerperProvider();
  }
  return instance;
}
```

`SOURCING_PROVIDER=serper` es el interruptor de reversión de la spec (requisito "Plan de
reversión a Serper") — activable sin deploy de código, solo variable de entorno.

---

## 6. Persistencia — reuso de schema existente

**No se crea schema nuevo para experiencia/educación/certificaciones/idiomas.** Ya existen,
con `candidateId` nullable pensado exactamente para este caso (candidato de pool, no de
autoservicio):

- `candidate_work_experiences` (`db/schema/index.ts:746`)
- `candidate_education` (`:769`)
- `candidate_certifications` (`:792`)
- `candidate_languages` (`:808`)

Las 4 tienen el mismo modelo de dueño: `(profileId IS NOT NULL) <> (candidateId IS NOT NULL)`
(CHECK constraint). El patrón de inserción ya existe — `persist-onboarding-draft.mutations.ts`
inserta en las 3 primeras (+ perfil) en una sola transacción para `profileId`. Este change
necesita el mismo patrón para `candidateId`, en el momento de **importar** un resultado de
Sourcing al pool (`importarSourcingResultadoAction`, `applications/actions.ts:287`, y su
equivalente si existe uno para la tab de Sourcing).

**Nueva función** `insertCandidateResume(candidateId, resume)` en
`src/features/recruiter/candidates/data/candidates.mutations.ts`, misma forma que
`persistOnboardingDraft` pero con `candidateId` en vez de `profileId`, reusando los tipos
`ExperienceFields`/`EducationFields`/`CertificationFields` ya definidos en
`candidate/profile/data/resume.mutations.ts` (mapeando `ProviderExperience` → `ExperienceFields`,
etc. — mismo shape, distintos nombres de campo en un par de casos, mapeo directo). Para
idiomas: `language`/`level` — `level` es un enum (`languageLevel`, ya usado por
`candidate_languages`); el nivel que devuelve HarvestAPI (texto libre tipo "Native",
"Professional") se mapea al enum existente — **definir la tabla de mapeo en tasks**, no
inventarla acá.

**Antes de importar** (mientras el candidato solo está en los resultados de la sesión, sin
guardar): la card/detalle clickeable (spec, requisito "Detalle de perfil clickeable") muestra
`experience`/`education`/`certifications`/`languages` desde el jsonb de
`sourcing_search_sessions.results` (se amplía su shape, ver §6.1) — no desde las tablas
relacionales, que recién se pueblan al importar.

### 6.1 Ampliar `sourcing_search_sessions.results`

Columna jsonb (`db/schema/index.ts:1002-1060`) ya tipada contra el shape de
`ScoredLinkedInCandidate` — se amplía junto con el tipo (§2): agrega `email`, `experience`,
`education`, `certifications`, `languages`. Es jsonb, no requiere migración de columna, solo
que el código que la lee/escribe use el tipo ampliado.

### 6.2 Nueva tabla — caché de perfiles ya obtenidos (no pagar dos veces)

No existe hoy ninguna persistencia de "perfiles obtenidos del proveedor" fuera de la sesión de
trabajo (`sourcing_search_sessions` se pisa por tanda). Nueva tabla:

```ts
export const sourcingProviderProfiles = pgTable("sourcing_provider_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  linkedinUrl: text("linkedin_url").notNull(), // normalizada al guardar
  // payload completo del proveedor (mismo shape que SourcingProviderCandidate), para poder
  // reusarlo sin re-llamar a HarvestAPI dentro del TTL.
  payload: jsonb("payload").notNull(),
  fetchedAt: timestamp("fetched_at").defaultNow().notNull(),
  ...timestamps,
}, (t) => ({
  orgIdx: index("sourcing_provider_profiles_org_idx").on(t.organizationId),
  uniqueOrgUrl: uniqueIndex("sourcing_provider_profiles_org_url_idx")
    .on(t.organizationId, t.linkedinUrl),
}));
```

Antes de llamar al proveedor por un perfil, si ya hay fila vigente (`fetchedAt` dentro del TTL
configurable, 30–60 días — confirmado en proposal.md §3.2) para esa `organizationId` +
`linkedinUrl`, se reusa y el evento de consumo es `REUSED_PROFILE` (no `NEW_PROFILE`, no
vuelve a cobrar — regla ya cerrada en `limitar-sourcing-ia`). El TTL exacto (30 vs. 60 vs. un
valor configurable por plan) es un número de configuración, no de schema — se define en tasks.

*Nota de secuencia con HarvestAPI*: como el descubrimiento y el enriquecimiento son la misma
llamada (§3), "ya tener el perfil" solo puede chequearse **antes** de correr la búsqueda por
`linkedinUrl` — pero la búsqueda en sí no se hace por URL, se hace por filtros. Esta caché
sirve sobre todo para el caso "el mismo candidato vuelve a aparecer en otra búsqueda/otro
recruiter de la misma org", no para evitar la llamada de búsqueda en sí.

**Aclaración de mecánica (2026-09-14)**: dado lo anterior, el chequeo de caché va **después**
de `SourcingProvider.search()`, no antes — por cada candidato devuelto, se busca en
`sourcing_provider_profiles` por `(organizationId, linkedinUrl)`. Si hay fila vigente (dentro
del TTL), el evento de consumo es `REUSED_PROFILE` (no cobra crédito al cliente — regla ya
cerrada en `limitar-sourcing-ia`), aunque HarvestAPI ya haya facturado ese perfil dentro del
costo de la página/`maxItems` de esta búsqueda — ese costo lo absorbe WeHunter, igual que el
resto del "costo real vs. créditos cobrados" que ya registra el requisito "Registro de
consumo y costo real". Si no hay fila vigente, el evento es `NEW_PROFILE` (consume crédito) y
se hace upsert de la fila con el payload y `fetchedAt` actuales — refresca el caché para la
próxima vez, sea el resultado nuevo o repetido.

---

## 7. Emisión de eventos de consumo (seam hacia `limitar-sourcing-ia`)

`limitar-sourcing-ia` todavía no llegó a `design`/`tasks`/`apply` — su sistema de créditos no
existe en código todavía. Este change **no puede depender de una tabla o función que no
existe**. Se define un punto de extensión mínimo, sin lógica de negocio de créditos:

```ts
// src/features/recruiter/sourcing/domain/sourcing-consumption-event.ts
export type SourcingConsumptionEvent = {
  organizationId: string;
  jobId: string;
  candidateKey: string; // linkedinUrl normalizada
  type: "NEW_PROFILE" | "REUSED_PROFILE" | "DUPLICATE" | "PROFILE_REFRESH" | "FAILED";
  costUsd: number;
  occurredAt: Date;
};

/** No-op hasta que `limitar-sourcing-ia` implemente el registro real. Loguea (server-timing/
 *  console) para no perder trazabilidad mientras tanto. Reemplazar la implementación acá
 *  es TODO el trabajo de integración cuando ese change llegue a `apply` — este archivo no
 *  cambia de forma, solo de cuerpo. */
export async function recordSourcingConsumption(
  event: SourcingConsumptionEvent,
): Promise<void> {
  console.info("[sourcing-consumption]", event); // reemplazar por el registro real
}
```

`sourcear-para-busqueda.ts` llama a `recordSourcingConsumption` una vez por candidato
procesado (nuevo, reusado o duplicado), usando `costUsd` del `SourcingProviderResult`. Esto
deja lista la integración para cuando `limitar-sourcing-ia` implemente el consumo real, sin
bloquear este change ni acoplarlo a una tabla que no existe.

---

## 8. Dedup — extensión a email

`findDuplicateCandidate(organizationId, { email, linkedinUrl })`
(`candidates/data/candidates.queries.ts:328`) **ya acepta ambas claves** — hoy
`importarSourcingResultadoAction` (`applications/actions.ts:305-307`) solo le pasa
`linkedinUrl`. Cambio: pasarle también `email` cuando HarvestAPI lo devuelve.

Para el chequeo **dentro del loop de búsqueda** (filtrar antes de scorear, hoy
`findExistingLinkedinUrls`, `sourcear-para-busqueda.ts:252`): generalizar a
`findExistingCandidateKeys(organizationId, { linkedinUrls, emails })` devolviendo las claves
ya existentes de ambos tipos — mismo patrón de query, `OR` entre las dos condiciones que ya
usa `findDuplicateCandidate` internamente (`candidates.queries.ts:336-342`), pero en lote en
vez de una por una.

Esto implementa el requisito "Detección de duplicado contra el Talent Pool" del spec
funcional: si matchea por cualquiera de las dos claves, el resultado se marca como
`DUPLICATE` (evento de consumo, §7) y la UI lo señala con link al Talent Pool — pero
**consume crédito igual** (regla ya cerrada, sin excepción).

---

## 9. Eliminar Sourcing Manual

Archivos a borrar:
- `src/features/recruiter/sourcing/ui/LinkedInSourcingTab.tsx`
- Server actions `buscarLinkedinAction` y `scorearCandidatoSourcingAction`
  (`sourcing/actions.ts`)

`SourcingView.tsx` pierde el selector de tabs — pasa a renderizar directo
`AiSourcingTab` (o se colapsan en un solo componente, a decidir en tasks si vale la pena
el rename dado que ya no hay "AI" vs. "no-AI").

---

## 10. UI — cantidad, detalle clickeable y "Limpiar"

`AiJobSourcingResults.tsx` (compartido por `AiSourcingTab` y `SourcingIADialog`, spec
requisito "Único punto de entrada compartido") cambia de "Buscar más candidatos" a:

- Selector de cantidad (stepper, 1–`SOURCING_MAX_RESULTS`) antes de correr la búsqueda —
  calcado del prototipo (`https://claude.ai/artifact/MkCJ4AvdpCSgnQ8DXZQiPr`,
  `.stepper`/`#qty`).
- Un solo botón "Buscar candidatos" — reemplaza al botón de "Buscar más".
- Estado de detalle expandible por card, mostrando `experience`/`education`/
  `certifications`/`languages` del `SourcingProviderCandidate`. Debe funcionar tanto en la
  vista de página completa (tab de Sourcing) como en el panel lateral angosto de
  `SourcingIADialog` (`Dialog side="right" className="max-w-xl"`) — usar un patrón
  responsive/colapsable (acordeón o modal secundario dentro del panel) en vez de columnas
  lado a lado, que no entran en `max-w-xl`.
- **Botón "Limpiar"** (nuevo, no está en el prototipo de créditos — es de este change):
  visible cuando hay resultados persistidos, dispara la mutation que resetea la fila de
  `sourcing_search_sessions` de esa búsqueda para poder correr una nueva desde cero.

Detalle visual (impeccable) fuera de este documento — se define cuando arranque la
implementación de UI.

---

## 11. Fuera de este diseño (queda para `tasks`)

- Campo exacto del actor de Apify para pasar skills como filtro (no confirmado en el input
  schema relevado — puede ir dentro de `searchQuery`).
- Tabla de mapeo de niveles de idioma (texto libre de HarvestAPI → enum `languageLevel`).
- TTL exacto de `sourcing_provider_profiles` dentro del rango 30–60 días confirmado.
- Migración Drizzle de la tabla nueva `sourcing_provider_profiles` (`pnpm db:generate` +
  revisión del SQL antes de aplicar, regla de siempre — `.claude/rules/database.md`).
- Si `sourcing_search_sessions.attempt` (cursor de "Buscar más", ya sin uso — §1.1) se retira
  con una migración, o simplemente deja de escribirse (más simple, sin migrar datos de una
  caché de trabajo descartable — decisión sugerida en §1.1, a confirmar en tasks).
- División en tareas con TDD (siguiente fase).
