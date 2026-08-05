# Módulo de Sourcing

Este módulo permite a los reclutadores buscar candidatos en **LinkedIn**, de dos formas
distintas, y guardarlos en el Pool de Talento de WeHunter (`/candidates`):

- **Sourcing con IA** (atado a una búsqueda): sin que el reclutador escriba nada, arma la query
  a partir del contexto de una búsqueda (puesto, skills, seniority, ubicación) y puntúa cada
  resultado con IA — trae todos los que encuentra (sin filtrar por score), ordenados de mayor a
  menor match, el reclutador decide mirando el %. El mismo flujo vive en dos lugares: la
  pantalla `/sourcing` (eligiendo la búsqueda de un selector) y un diálogo en Postulados (ya
  scopeado a esa búsqueda) — comparten el mismo componente de UI.
- **Búsqueda en LinkedIn** (libre, sin búsqueda asociada): el reclutador tipea texto libre
  (ej. *"backend engineer supabase python"*), se formatea como query X-Ray
  (`site:linkedin.com/in/ ...`) y se importa al pool sin postular a ninguna búsqueda.

No hay generación de resultados 100% inventados en ningún camino — ambos pegan al mismo motor
real (`searchLinkedInCandidates`), con fallback declarado como tal cuando no hay `SERPER_API_KEY`.

---

## 📌 Aspectos Funcionales

1. **Sourcing con IA**: elegís una búsqueda (o ya estás en Postulados de una) y el sistema
   arma la query y puntúa los resultados solo. "Sumar al pool y postular" agrega el candidato
   y lo postula directo a esa búsqueda en un solo paso.
2. **Búsqueda en LinkedIn**: buscador de texto libre, resultados con "Ver perfil" (link directo
   a LinkedIn) e "Importar al pool" (sin postular a ninguna búsqueda).
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
       └── LinkedInSourcingTab.tsx                          (texto libre)
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
- **`importarSourcingAction`**: importa al pool sin postular (camino libre).
- **`importarSourcingResultadoAction`** (en `features/recruiter/applications/actions.ts`):
  dedupe por `linkedinUrl` + postula a la búsqueda (camino con IA).

### 3. Interfaz de Usuario (`src/features/recruiter/sourcing/ui/`)
- **`SourcingView.tsx`**: tabs "Sourcing con IA" / "Búsqueda en LinkedIn".
- **`AiSourcingTab.tsx`**: selector de búsqueda (`Select`, poblado con búsquedas abiertas).
- **`AiJobSourcingResults.tsx`**: búsqueda + lista puntuada + import/omitir, parametrizado por
  `jobId`. Compartido con el diálogo de Postulados.
- **`LinkedInSourcingTab.tsx`**: buscador de texto libre, chips de sugerencia, import al pool.

---

## 🔑 Variables de Entorno (`.env.local`)

| Variable | Descripción | Requerido |
| :--- | :--- | :--- |
| `SERPER_API_KEY` | API Key de [Serper.dev](https://serper.dev) (búsquedas de Google en tiempo real para perfiles reales de LinkedIn). | **Requerido** para personas reales; sin ella, ambos caminos usan el fallback demo declarado. |

---

## 🧪 Cómo Probar

1. Iniciar sesión, ir a **Sourcing** ([http://localhost:3000/sourcing](http://localhost:3000/sourcing)).
2. **Sourcing con IA**: elegir una búsqueda abierta del selector → "Buscar en LinkedIn" → ver
   resultados con su % de match, ordenados de mayor a menor → "Sumar al pool y postular".
3. **Búsqueda en LinkedIn**: tab libre, tipear o click en un chip de sugerencia → "Buscar en
   LinkedIn" → "Ver perfil" / "Importar al pool".
4. Mismo flujo de IA disponible desde Postulados de una búsqueda puntual (botón "Sourcing con
   IA" en el header).
