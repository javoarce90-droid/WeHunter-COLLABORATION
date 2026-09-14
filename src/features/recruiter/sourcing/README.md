# Módulo de Sourcing

Este módulo permite a los reclutadores buscar candidatos en **LinkedIn**, atado siempre a una
búsqueda, y guardarlos en el Pool de Talento de WeHunter (`/candidates`).

- **Un solo flujo** (ya no hay "Sourcing Manual" separado, ver
  `openspec/changes/integrar-harvestapi-sourcing/`): sin que el reclutador escriba nada, arma
  los filtros a partir del contexto de una búsqueda (puesto, skills, seniority, ubicación),
  pide una cantidad de candidatos elegida de antemano (1 a `SOURCING_MAX_RESULTS`) y puntúa
  cada resultado con IA en una sola llamada de lote — trae todos los que encuentra (sin
  filtrar por score), ordenados de mayor a menor match, el reclutador decide mirando el %. El
  mismo flujo vive en dos lugares: la pantalla `/sourcing` (eligiendo la búsqueda de un
  selector) y un diálogo en Postulados (ya scopeado a esa búsqueda) — comparten el mismo
  componente de UI.
- **Sin "Buscar más"**: una sola búsqueda por cantidad pedida, no una iteración de clicks. Los
  resultados de la última búsqueda persisten por búsqueda laboral hasta que el reclutador usa
  "Limpiar" — volver a buscar reemplaza los resultados, no los acumula.

El descubrimiento + enriquecimiento corre detrás de la interface `SourcingProvider`
(`domain/sourcing-provider.ts`) — el dominio y la UI no conocen al proveedor concreto. Hoy
existen dos implementaciones:

- **`HarvestApiProvider`** (`data/harvest-api-provider.ts`): proveedor por defecto. Una sola
  llamada que trae ubicación, skills, experiencia, educación, certificaciones e idiomas
  reales del perfil. Sin fallback a datos placeholder — sin `APIFY_API_TOKEN`, cae a un mock
  determinístico declarado como tal.
- **`SerperProvider`** (`data/serper-provider.ts`): plan de reversión (interruptor
  `SOURCING_PROVIDER=serper`), Google X-Ray sobre `SERPER_API_KEY`. No trae experiencia,
  educación, certificaciones ni idiomas — esos campos quedan vacíos con este proveedor (techo
  ya conocido, no una regresión del código).

---

## 📌 Aspectos Funcionales

1. **Sourcing con IA**: elegís una búsqueda (o ya estás en Postulados de una), elegís cuántos
   candidatos querés (1–10) y el sistema arma los filtros, busca y puntúa los resultados solo.
   "Sumar al pool y postular" agrega el candidato y lo postula directo a esa búsqueda en un
   solo paso.
2. **Importación al Pool de WeHunter**: el candidato se inserta en `candidates` con
   `source = 'linkedin'`, deduplicado por `linkedin_url` y por `email` (con HarvestAPI los
   candidatos sí traen email real).

---

## 🏗️ Arquitectura Técnica y Capas (3-Tier Layering)

```
src/app/(app)/sourcing/page.tsx                    (Server Component: trae listJobs abiertas)
       │
       ▼
src/features/recruiter/sourcing/ui/SourcingView.tsx
       └── AiSourcingTab.tsx → AiJobSourcingResults.tsx  (selector de búsqueda + resultados)
       │
       ▼
src/features/recruiter/sourcing/actions.ts (Server Actions con Zod)
       │
       ▼
src/features/recruiter/sourcing/domain/
       ├── sourcing-provider.ts        (interface SourcingProvider — contrato del proveedor)
       ├── get-sourcing-provider.ts    (selección: HarvestAPI por defecto, Serper de reversión)
       └── sourcear-para-busqueda.ts   (filtros + dedup contra el pool + scoring desde el job)
       │
       ▼
src/features/recruiter/sourcing/data/
       ├── harvest-api-provider.ts     (implementación real — proveedor por defecto)
       └── serper-provider.ts          (implementación de reversión + fallback mock)
       │
       ▼
src/features/recruiter/candidates/data/candidates.mutations.ts (Drizzle ORM → PostgreSQL)
```

`AiJobSourcingResults.tsx` es el componente compartido entre `AiSourcingTab` (pantalla
`/sourcing`) y `SourcingIADialog.tsx` (diálogo en Postulados, `features/recruiter/applications/ui/`)
— misma lógica, un solo lugar.

### 1. Dominio (`src/features/recruiter/sourcing/domain/`)
- **`sourcing-provider.ts`**: interface `SourcingProvider` (`search(filters, maxResults,
  exclude)`) y los tipos del contrato (`SourcingFilters`, `SourcingProviderCandidate` —
  incluye `experience`, `education`, `certifications`, `languages`, `email`).
- **`get-sourcing-provider.ts`**: `getSourcingProvider()` — HarvestAPI si hay
  `APIFY_API_TOKEN` (y no está forzado `SOURCING_PROVIDER=serper`), Serper si no.
- **`sourcear-para-busqueda.ts`**:
  - `jobToSourcingFilters(job)`: arma los filtros a partir del puesto/skills/seniority/
    ubicación de una búsqueda, sin input del reclutador.
  - `sourcearParaBusqueda(job, maxResults, deps)`: UNA sola llamada a `deps.search`, dedupe
    contra el pool, scoring en lote, sin cursor ni merge entre tandas (ya no existe "Buscar
    más" — ver `openspec/changes/integrar-harvestapi-sourcing/design.md` §1.1).

### 2. Puerta de Entrada (`src/features/recruiter/sourcing/actions.ts`)
- **`sourcearParaBusquedaAction(jobId, maxResults)`**: dado un `jobId` y la cantidad elegida,
  orquesta `sourcearParaBusqueda` y persiste la sesión.
- **`importarSourcingAction`**: importa al pool sin postular.
- **`importarSourcingResultadoAction`** (en `features/recruiter/applications/actions.ts`):
  dedupe por `linkedinUrl` y `email` + postula a la búsqueda.
- **`getSourcingSessionAction`** / **`limpiarSourcingSessionAction`**: hidratan/limpian la
  sesión persistida por búsqueda laboral.

### 3. Interfaz de Usuario (`src/features/recruiter/sourcing/ui/`)
- **`SourcingView.tsx`**: shell de la pantalla `/sourcing`, dueño del tipo
  `SourcingJobOption`.
- **`AiSourcingTab.tsx`**: selector de búsqueda obligatorio (`Select`, poblado con búsquedas
  abiertas) — sin búsqueda no hay contexto para armar los filtros ni scorear.
- **`AiJobSourcingResults.tsx`**: selector de cantidad + búsqueda + lista puntuada +
  import/omitir, parametrizado por `jobId`. Compartido con el diálogo de Postulados.
- **`SourcingCandidateCard.tsx`**: card de candidato, `match`/`matchLoading` opcionales y
  `selectable` opcional (checkbox de selección múltiple) — ausente para candidatos ya
  importados u omitidos. Si recibe `match` muestra `MatchCell` — el mismo componente de
  score+confianza+recomendación que usa la tabla de Postulados — y el anillo abre
  `AiAnalysisDialog` con el desglose completo del match (breakdown por categoría, fortalezas,
  riesgos). Con `matchLoading` sin `match` todavía, muestra un spinner en su lugar en vez de
  dejar el espacio vacío.

### Selección múltiple / acciones en lote

Soporta seleccionar varios candidatos (`selected: Set<candidateId>`) y procesarlos juntos,
mismo patrón visual y de estado que ya existía en `CandidatesList.tsx` (pool de candidatos):
barra condicional (`selected.size > 0`) entre el contador de resultados y la lista, con fondo
`bg-primary-light`/`border-primary/30`, contador "N seleccionados", botón de acción primaria y
link para deseleccionar. Un link "Seleccionar todos" en la fila del contador alterna la
selección de todos los candidatos aún sin decisión.

No hay caso de uso de dominio nuevo para el import en lote — se reusan las mismas server
actions del camino individual (`importarSourcingResultadoAction`/`importarSourcingAction`), una
llamada por candidato vía `Promise.all` (el tope ya es 10 resultados, no hay problema de
volumen). El estado "en curso" pasa de un solo `importingId` a un `pendingIds: Set<candidateId>`
compartido entre import individual y en lote — cada card se deshabilita mientras hay algo en
curso que no sea ella misma. Un fallo parcial no rompe el resto: los candidatos que sí se
importaron quedan marcados, los que fallaron se quedan en la lista para reintentar de a uno, y
el toast resume cuántos de cuántos se lograron.

`AiAnalysisDialog.tsx` (en `features/recruiter/applications/ui/`) recibe un
`AiAnalysisSubject` genérico (`name, headline?, score, summary, breakdown, strengths,
redFlags`), así que el mismo "Copiloto de reclutamiento" que ya existía en Postulados se reusa
tal cual en Sourcing, sin duplicar el desglose por categoría ni las listas de
fortalezas/riesgos.

### Comparar candidatos

Se dispara desde la barra de selección (arriba): el botón **"Comparar"** aparece solo cuando
`selected.size === 2` exactamente (la selección en sí no tiene tope, sigue sirviendo para bulk
import/omit con cualquier cantidad — el tope de 2 es específico de esta acción). Al click,
`CompareCandidatesDialog.tsx` (`sourcing/ui/`) muestra a los dos candidatos en columnas lado a
lado (`grid-cols-1 sm:grid-cols-2`, apila en mobile): datos básicos (avatar, headline,
ubicación, skills, link a LinkedIn) y el match completo — `MatchCell` + desglose por categoría
+ fortalezas/riesgos (siempre presente en Sourcing con IA, ya que todo resultado está atado a
una búsqueda y se scorea automáticamente).

**Cero componente de match nuevo**: `MatchBreakdown` y `MatchHighlights` (las barras por
categoría y las listas de fortalezas/riesgos) son named exports de `AiAnalysisDialog.tsx` —
las usan tanto ese diálogo como `CompareCandidatesDialog`, mismo lenguaje visual, un solo
lugar que lo dibuja.

**Ajuste al `Dialog` compartido** (`src/components/ui/dialog.tsx`): el modal centrado tenía el
`max-width` hardcodeado en `max-w-lg` en el `<dialog>` exterior — el `className` que recibía el
componente solo llegaba al wrapper interior, así que ningún caller podía pedir algo más ancho.
Se agregó `maxWidthClassName` (opcional, default `max-w-lg`, no toca el sheet lateral) para que
`CompareCandidatesDialog` pueda pedir `max-w-3xl` sin romper ningún uso existente — todos los
demás diálogos centrados siguen exactamente igual porque no pasan ese prop.

**También se usa desde Postulados** (`PostuladosTable.tsx`, `features/recruiter/applications/ui/`):
mismo componente, mismo criterio de "Comparar" solo con 2 seleccionados. La barra de selección
ahí también conecta **"Pasar N al pipeline" en lote**, reusando `onPasarAlPipeline(ids: string[])`
tal cual (ya soportaba varios ids desde antes, solo hacía falta una barra que se los pasara).
Reject y guardar en pool siguen sin bulk conectado — sus actions también aceptan varios ids,
queda como próximo paso si hace falta. `CompareSubject.linkedinUrl` y `match.breakdown` son
nullable porque un postulado puede no venir de LinkedIn, o no tener "Analizar con IA" corrido
todavía — Sourcing sigue pasando ambos siempre presentes, sin cambios ahí. `listPostulados` (en
`applications/data/applications.queries.ts`) suma `location`/`skills`/`linkedinUrl` al select
para tener con qué armar la comparación.

---

## 🔑 Variables de Entorno (`.env.local`)

| Variable | Descripción | Requerido |
| :--- | :--- | :--- |
| `APIFY_API_TOKEN` | Token de [Apify](https://apify.com) para correr el actor `harvestapi/linkedin-profile-search` (proveedor por defecto). | **Requerido** para datos reales; sin él, el proveedor cae a un fallback demo declarado. |
| `SOURCING_PROVIDER` | Interruptor de reversión — con `serper`, fuerza `SerperProvider` aunque haya `APIFY_API_TOKEN`. | Opcional. |
| `SERPER_API_KEY` | API Key de [Serper.dev](https://serper.dev), solo usada por `SerperProvider` (plan de reversión). | Opcional — solo si se activa `SOURCING_PROVIDER=serper`. |

---

## 🧪 Cómo Probar

1. Iniciar sesión, ir a **Sourcing** ([http://localhost:3000/sourcing](http://localhost:3000/sourcing)).
2. Elegir una búsqueda abierta del selector, elegir cuántos candidatos querés (1–10) → "Buscar
   candidatos" → ver resultados con su % de match, ordenados de mayor a menor → click en el
   anillo de match para ver el detalle completo (desglose, fortalezas, riesgos) → "Sumar al
   pool y postular".
3. Confirmar que los resultados persisten si navegás a otra pantalla y volvés, y que
   "Limpiar" los borra para poder correr una búsqueda nueva.
4. Mismo flujo disponible desde Postulados de una búsqueda puntual (botón "Sourcing con IA" en
   el header) — sin selector de búsqueda, ya scopeado.
5. **Acciones en lote**: tildar el checkbox de 2+ candidatos → aparece la barra de selección →
   "Importar/Sumar N seleccionados" o "Omitir seleccionados" → confirmar que los que se
   importan quedan marcados y desaparecen de la selección, y que "Seleccionar todos" alterna
   correctamente.
6. **Comparar candidatos**: tildar exactamente 2 → aparece el botón "Comparar" en la barra
   (tildar un 3ro y confirmar que desaparece) → click → diálogo con las dos columnas lado a
   lado.
7. **Postulados**: mismo flujo de Comparar (2 tildados → botón → diálogo) más "Pasar N al
   pipeline" en lote (cualquier cantidad ≥1) → confirmar que las filas pasadas desaparecen de
   la bandeja y el toast muestra cuántas se hicieron / saltaron.
