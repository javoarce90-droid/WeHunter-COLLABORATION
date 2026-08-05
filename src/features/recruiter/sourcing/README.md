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
  - `sourcearParaBusqueda(job, deps)`: orquesta `search` + `scoreApplication` (mismo contrato
    de IA que el matching de Postulados), sin filtrar por score, ordenado por match, corta a 10.

### 2. Puerta de Entrada (`src/features/recruiter/sourcing/actions.ts`)
- **`buscarLinkedinAction`**: query libre → `searchLinkedInCandidates`.
- **`sourcearParaBusquedaAction`**: dado un `jobId`, orquesta `sourcearParaBusqueda`.
- **`importarSourcingAction`**: importa al pool sin postular (Sourcing Manual sin búsqueda
  elegida).
- **`importarSourcingResultadoAction`** (en `features/recruiter/applications/actions.ts`):
  dedupe por `linkedinUrl` + postula a la búsqueda. Camino compartido por Sourcing con IA y
  Sourcing Manual cuando el reclutador eligió una búsqueda.

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
  — un `<select>` inline en el footer de la card, por candidato) y `match` opcional (solo
  Sourcing con IA, que ya está scopeada a una única búsqueda). Si recibe `match` muestra
  `MatchCell` — el mismo componente de score+confianza+recomendación que usa la tabla de
  Postulados — y el anillo abre `AiAnalysisDialog` con el desglose completo del match
  (breakdown por categoría, fortalezas, riesgos). Sourcing Manual no pasa `match`: ese modo no
  calcula compatibilidad, no hay contra qué comparar sin una búsqueda de contexto siempre
  presente.

`AiAnalysisDialog.tsx` (en `features/recruiter/applications/ui/`) dejó de estar acoplado a
`PostuladoRow` — ahora recibe un `AiAnalysisSubject` genérico (`name, headline?, score,
summary, breakdown, strengths, redFlags`), así que el mismo "Copiloto de reclutamiento" que ya
existía en Postulados se reusa tal cual en Sourcing, sin duplicar el desglose por categoría ni
las listas de fortalezas/riesgos.

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
   puede ir a una búsqueda distinta).
4. Mismo flujo de IA disponible desde Postulados de una búsqueda puntual (botón "Sourcing con
   IA" en el header).
