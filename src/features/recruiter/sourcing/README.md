# Módulo de Sourcing

Este módulo permite a los reclutadores buscar candidatos en **LinkedIn**, de dos formas
distintas, y guardarlos en el Pool de Talento de WeHunter (`/candidates`):

- **Sourcing con IA** (atado a una búsqueda): sin que el reclutador escriba nada, arma la query
  a partir del contexto de una búsqueda (puesto, skills, seniority, ubicación) y puntúa cada
  resultado con IA — trae todos los que encuentra (sin filtrar por score), ordenados de mayor a
  menor match, el reclutador decide mirando el %. El mismo flujo vive en dos lugares: la
  pantalla `/sourcing` (eligiendo la búsqueda de un selector) y un diálogo en Postulados (ya
  scopeado a esa búsqueda) — comparten el mismo componente de UI.
- **Sourcing Manual** (libre, sin búsqueda obligatoria): el reclutador tipea texto libre
  (ej. *"backend engineer supabase python"*), se formatea como query X-Ray
  (`site:linkedin.com/in/ ...`). Elegir una búsqueda es opcional y **es por candidato, no por
  tab**: cada resultado tiene su propio selector — si no elige ninguna, "Importar al pool" solo
  guarda ese candidato; si elige una, el botón de ese candidato pasa a "Importar y postular" y
  usa el mismo camino que Sourcing con IA (`importarSourcingResultadoAction`). Dos candidatos de
  la misma búsqueda pueden ir a búsquedas distintas (o ninguna).

No hay generación de resultados 100% inventados en ningún camino — ambos pegan al mismo motor
real (`searchLinkedInCandidates`), con fallback declarado como tal cuando no hay `SERPER_API_KEY`.

---

## 📌 Aspectos Funcionales

1. **Sourcing con IA**: elegís una búsqueda (o ya estás en Postulados de una) y el sistema
   arma la query y puntúa los resultados solo. "Sumar al pool y postular" agrega el candidato
   y lo postula directo a esa búsqueda en un solo paso.
2. **Sourcing Manual**: buscador de texto libre, resultados con "Ver perfil" (link directo a
   LinkedIn) e "Importar al pool" — o "Importar y postular" si eligió una búsqueda en el
   selector opcional de esa card puntual (por candidato, no uno global para toda la tab).
3. **Importación al Pool de WeHunter**: en ambos caminos, el candidato se inserta en
   `candidates` con `source = 'linkedin'`, deduplicado por `linkedin_url` cuando corresponde.

---

## 🏗️ Arquitectura Técnica y Capas (3-Tier Layering)

```
src/app/(app)/sourcing/page.tsx                    (Server Component: trae listJobs abiertas)
       │
       ▼
src/features/recruiter/sourcing/ui/SourcingView.tsx        (tabs)
       ├── AiSourcingTab.tsx → AiJobSourcingResults.tsx     (selector de búsqueda + resultados)
       └── LinkedInSourcingTab.tsx                          (texto libre + búsqueda opcional)
       │
       ▼
src/features/recruiter/sourcing/actions.ts (Server Actions con Zod)
       │
       ▼
src/features/recruiter/sourcing/domain/
       ├── linkedin-search.ts          (motor real: Serper + fallback mock declarado)
       └── sourcear-para-busqueda.ts   (query + scoring desde el contexto de un job)
       │
       ▼
src/features/recruiter/candidates/data/candidates.mutations.ts (Drizzle ORM → PostgreSQL)
```

`AiJobSourcingResults.tsx` es el componente compartido entre `AiSourcingTab` (pantalla
`/sourcing`) y `SourcingIADialog.tsx` (diálogo en Postulados, `features/recruiter/applications/ui/`)
— misma lógica, un solo lugar.

### 1. Dominio (`src/features/recruiter/sourcing/domain/`)
- **`linkedin-search.ts`**:
  - `LinkedInCandidateResult`: perfil encontrado (`id, name, headline, location, skills,
    linkedinUrl, snippet?`).
  - `buildLinkedInXRayQuery(freeText)`: formatea texto libre a sintaxis X-Ray de Google.
  - `searchLinkedInCandidates(input)`: si hay `SERPER_API_KEY`, consulta
    `https://google.serper.dev/search` en tiempo real; si no, cae a un fallback determinístico
    (declarado como demo en la UI, nunca se muestra como real).
- **`sourcear-para-busqueda.ts`**:
  - `buildJobSourcingQuery(job)`: arma la query a partir del puesto/skills/seniority/ubicación
    de una búsqueda, sin input del reclutador.
  - `scoreLinkedInCandidate(candidate, job, scoreApplication)`: scorea UN candidato contra una
    búsqueda (arma el `ScoreApplicationInput`, mismo contrato de IA que Postulados). Función
    pura reusada tanto por el lote de Sourcing con IA como por el score puntual de Sourcing
    Manual — un solo lugar que arma el input, cero duplicación.
  - `sourcearParaBusqueda(job, deps)`: orquesta `search` + `scoreLinkedInCandidate` por cada
    resultado, sin filtrar por score, ordenado por match, corta a `SOURCING_MAX_RESULTS` (10).
  - `SOURCING_MANUAL_SCORE_CAP` (10): tope de candidatos scoreados automáticamente por tanda en
    Sourcing Manual (ver más abajo).

### 2. Puerta de Entrada (`src/features/recruiter/sourcing/actions.ts`)
- **`buscarLinkedinAction`**: query libre → `searchLinkedInCandidates`.
- **`sourcearParaBusquedaAction`**: dado un `jobId`, orquesta `sourcearParaBusqueda`.
- **`importarSourcingAction`**: importa al pool sin postular (Sourcing Manual sin búsqueda
  elegida).
- **`importarSourcingResultadoAction`** (en `features/recruiter/applications/actions.ts`):
  dedupe por `linkedinUrl` + postula a la búsqueda. Camino compartido por Sourcing con IA y
  Sourcing Manual cuando el reclutador eligió una búsqueda.
- **`scorearCandidatoSourcingAction`**: score post-hoc de un candidato puntual de Sourcing
  Manual contra una búsqueda (ver sección de abajo). Auth + `getJobById` + llama
  `scoreLinkedInCandidate` — el guardrail contra abuso vive en el cliente, no acá.

### 3. Interfaz de Usuario (`src/features/recruiter/sourcing/ui/`)
- **`SourcingView.tsx`**: tabs "Sourcing con IA" / "Sourcing Manual"; dueño del tipo
  `SourcingJobOption` que ambas tabs comparten.
- **`AiSourcingTab.tsx`**: selector de búsqueda obligatorio (`Select`, poblado con búsquedas
  abiertas) — sin búsqueda no hay contexto para armar la query ni scorear.
- **`AiJobSourcingResults.tsx`**: búsqueda + lista puntuada + import/omitir, parametrizado por
  `jobId`. Compartido con el diálogo de Postulados.
- **`LinkedInSourcingTab.tsx`**: buscador de texto libre, chips de sugerencia. El selector de
  búsqueda es **opcional y por candidato** (a diferencia del obligatorio y por-tab de la tab con
  IA) — vive en `jobByCandidate: Record<candidateId, jobId>`, no en un único estado de tab.
- **`SourcingCandidateCard.tsx`**: card de candidato única, compartida por ambas tabs (antes
  cada una tenía su propio layout). Acepta un `jobPicker` opcional (solo Sourcing Manual lo usa
  — un `<select>` inline en el footer de la card, por candidato), `match`/`matchLoading`
  opcionales y `selectable` opcional (checkbox de selección múltiple, ver abajo) — ausente para
  candidatos ya importados u omitidos. Si recibe `match` muestra `MatchCell` — el mismo
  componente de score+confianza+recomendación que usa la tabla de Postulados — y el anillo abre
  `AiAnalysisDialog` con el desglose completo del match (breakdown por categoría, fortalezas,
  riesgos). Con `matchLoading` sin `match` todavía, muestra un spinner en su lugar en vez de
  dejar el espacio vacío.

### Score post-hoc en Sourcing Manual

Sourcing con IA scorea automáticamente porque ya está atado a una búsqueda; Sourcing Manual no
tiene ese contexto por default, así que el score ahí es **por candidato, on-demand**: se
dispara solo al elegir una búsqueda en el `jobPicker` de esa card puntual (no hace falta un
botón aparte). Reusa el mismo motor de scoring (`AiProvider.scoreApplication`, mismo contrato
en toda la app) — no hay IA nueva, solo se expone puntualmente.

Dos guardrails contra abuso (cada score es una llamada real a la IA, y acá no hay un tope
natural de "una búsqueda por tanda" como en la tab con IA):
- **Una vez por par (candidato, búsqueda)**: si ya se scoreó ese par, no se reintenta solo —
  incluye los que fallaron. Elegir una búsqueda *distinta* para el mismo candidato sí dispara un
  score nuevo (es otro par).
- **Tope por tanda** (`SOURCING_MANUAL_SCORE_CAP`, 10 — coincide con el máximo de resultados,
  así que hoy el freno real es el de arriba): al llegar al tope, elegir una búsqueda para un par
  no scoreado simplemente no dispara el análisis — el reclutador igual puede postular sin el %.
  Un toast avisa la primera vez.

Estado en `LinkedInSourcingTab.tsx`: `scores: Record<pairKey, ScoredLinkedInCandidate>` (los ya
calculados), `attemptedPairs: Set<pairKey>` (gate de "una vez" + base del tope, `pairKey =
\`${candidateId}::${jobId}\``), `scoringIds: Set<candidateId>` (loading, separado de
`pendingIds` para no bloquear el botón de importar mientras se scorea en el fondo). Los tres se
resetean con cada búsqueda nueva y con "Limpiar" — el tope es por tanda, no por sesión.

### Selección múltiple / acciones en lote

Ambas tabs soportan seleccionar varios candidatos (`selected: Set<candidateId>`) y procesarlos
juntos, mismo patrón visual y de estado que ya existía en `CandidatesList.tsx` (pool de
candidatos): barra condicional (`selected.size > 0`) entre el contador de resultados y la
lista, con fondo `bg-primary-light`/`border-primary/30`, contador "N seleccionados", botón de
acción primaria y link para deseleccionar. Un link "Seleccionar todos" en la fila del contador
alterna la selección de todos los candidatos aún sin decisión.

No hay caso de uso de dominio nuevo para el import en lote — se reusan las mismas server
actions del camino individual (`importarSourcingResultadoAction`/`importarSourcingAction`), una
llamada por candidato vía `Promise.all` (el tope ya es 10 resultados, no hay problema de
volumen). El estado "en curso" pasa de un solo `importingId` a un `pendingIds: Set<candidateId>`
compartido entre import individual y en lote — cada card se deshabilita mientras hay algo en
curso que no sea ella misma. Un fallo parcial no rompe el resto: los candidatos que sí se
importaron quedan marcados, los que fallaron se quedan en la lista para reintentar de a uno, y
el toast resume cuántos de cuántos se lograron. En Sourcing Manual, el bulk import respeta la
búsqueda que cada candidato tenga elegida en su propio `jobPicker` (o pool si no eligió
ninguna) — no hay una elección de búsqueda "para todo el lote".

`AiAnalysisDialog.tsx` (en `features/recruiter/applications/ui/`) dejó de estar acoplado a
`PostuladoRow` — ahora recibe un `AiAnalysisSubject` genérico (`name, headline?, score,
summary, breakdown, strengths, redFlags`), así que el mismo "Copiloto de reclutamiento" que ya
existía en Postulados se reusa tal cual en Sourcing, sin duplicar el desglose por categoría ni
las listas de fortalezas/riesgos.

### Comparar candidatos

Última pieza del backlog de Sourcing — no había ningún patrón de comparación en la app, se
diseñó desde cero. Se dispara desde la barra de selección (arriba): el botón **"Comparar"**
aparece solo cuando `selected.size === 2` exactamente (la selección en sí no tiene tope, sigue
sirviendo para bulk import/omit con cualquier cantidad — el tope de 2 es específico de esta
acción). Al click, `CompareCandidatesDialog.tsx` (`sourcing/ui/`) muestra a los dos candidatos
en columnas lado a lado (`grid-cols-1 sm:grid-cols-2`, apila en mobile): datos básicos (avatar,
headline, ubicación, skills, link a LinkedIn) y, si el candidato ya tiene score calculado, el
match completo — `MatchCell` + desglose por categoría + fortalezas/riesgos. En Sourcing con IA
el match siempre está; en Sourcing Manual solo si el reclutador ya eligió una búsqueda para ese
candidato puntual (score post-hoc, ver arriba) — si no, esa columna muestra una nota en vez del
match, en lugar de dejar el hueco vacío o forzar un scoring que el reclutador no pidió.

**Cero componente de match nuevo**: `MatchBreakdown` y `MatchHighlights` (las barras por
categoría y las listas de fortalezas/riesgos) se extrajeron como named exports de
`AiAnalysisDialog.tsx` — antes vivían inline ahí, ahora las usan tanto ese diálogo como
`CompareCandidatesDialog`, mismo lenguaje visual, un solo lugar que lo dibuja.

**Ajuste al `Dialog` compartido** (`src/components/ui/dialog.tsx`): el modal centrado tenía el
`max-width` hardcodeado en `max-w-lg` en el `<dialog>` exterior — el `className` que recibía el
componente solo llegaba al wrapper interior, así que ningún caller podía pedir algo más ancho.
Se agregó `maxWidthClassName` (opcional, default `max-w-lg`, no toca el sheet lateral) para que
`CompareCandidatesDialog` pueda pedir `max-w-3xl` sin romper ningún uso existente — todos los
demás diálogos centrados siguen exactamente igual porque no pasan ese prop.

**También se usa desde Postulados** (`PostuladosTable.tsx`, `features/recruiter/applications/ui/`):
mismo componente, mismo criterio de "Comparar" solo con 2 seleccionados. La barra de selección
ahí es nueva — Postulados no tenía ningún mecanismo de selección múltiple antes de esto — y
además de "Comparar" ya conecta **"Pasar N al pipeline" en lote**, reusando
`onPasarAlPipeline(ids: string[])` tal cual (ya soportaba varios ids desde antes, solo hacía
falta una barra que se los pasara). Reject y guardar en pool siguen sin bulk conectado — sus
actions también aceptan varios ids, queda como próximo paso si hace falta. `CompareSubject.
linkedinUrl` y `match.breakdown` son nullable porque un postulado puede no venir de LinkedIn, o
no tener "Analizar con IA" corrido todavía — Sourcing sigue pasando ambos siempre presentes, sin
cambios ahí. `listPostulados` (en `applications/data/applications.queries.ts`) suma
`location`/`skills`/`linkedinUrl` al select para tener con qué armar la comparación (antes no
los traía).

---

## 🔑 Variables de Entorno (`.env.local`)

| Variable | Descripción | Requerido |
| :--- | :--- | :--- |
| `SERPER_API_KEY` | API Key de [Serper.dev](https://serper.dev) (búsquedas de Google en tiempo real para perfiles reales de LinkedIn). | **Requerido** para personas reales; sin ella, ambos caminos usan el fallback demo declarado. |

---

## 🧪 Cómo Probar

1. Iniciar sesión, ir a **Sourcing** ([http://localhost:3000/sourcing](http://localhost:3000/sourcing)).
2. **Sourcing con IA**: elegir una búsqueda abierta del selector → "Buscar en LinkedIn" → ver
   resultados con su % de match, ordenados de mayor a menor → click en el anillo de match para
   ver el detalle completo (desglose, fortalezas, riesgos) → "Sumar al pool y postular".
3. **Sourcing Manual**: tab libre, tipear o click en un chip de sugerencia → "Buscar en
   LinkedIn" → "Ver perfil" / "Importar al pool" por candidato, o elegir una búsqueda en el
   selector de esa card puntual para que su botón pase a "Importar y postular" (cada candidato
   puede ir a una búsqueda distinta). Elegir la búsqueda también dispara el score post-hoc —
   confirmar que aparece "Analizando…" y después el anillo de match, que reelegir la misma
   búsqueda para ese candidato NO vuelve a pedir el score (usa el cache), y que elegir una
   búsqueda distinta sí lo recalcula.
4. Mismo flujo de IA disponible desde Postulados de una búsqueda puntual (botón "Sourcing con
   IA" en el header).
5. **Acciones en lote** (ambas tabs): tildar el checkbox de 2+ candidatos → aparece la barra de
   selección → "Importar/Sumar N seleccionados" o "Omitir seleccionados" → confirmar que los
   que se importan quedan marcados y desaparecen de la selección, y que "Seleccionar todos"
   alterna correctamente.
6. **Comparar candidatos**: tildar exactamente 2 → aparece el botón "Comparar" en la barra
   (tildar un 3ro y confirmar que desaparece) → click → diálogo con las dos columnas lado a
   lado. En Sourcing Manual, comparar un candidato con búsqueda elegida (con match) y otro sin
   elegir ninguna (sin match) → confirmar que esa columna muestra la nota en vez del match.
7. **Postulados**: mismo flujo de Comparar (2 tildados → botón → diálogo) más "Pasar N al
   pipeline" en lote (cualquier cantidad ≥1) → confirmar que las filas pasadas desaparecen de
   la bandeja y el toast muestra cuántas se hicieron / saltaron.
