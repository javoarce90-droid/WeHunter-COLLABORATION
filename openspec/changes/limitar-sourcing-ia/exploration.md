# Exploración — Límites de uso para Sourcing con IA

> Notas internas de investigación del código actual. Base para la propuesta.

## Cómo funciona Sourcing con IA hoy

Flujo de un clic desde `/jobs/[id]/postulados`:

1. `sourcearParaBusquedaAction(jobId, step)` (`src/features/recruiter/sourcing/actions.ts`)
   valida auth + capability `candidates.manage`, carga el job.
2. `sourcearParaBusqueda()` (`domain/sourcear-para-busqueda.ts`) recorre LinkedIn:
   - Arma hasta **4 variantes** de query (de precisa a amplia) con puesto + 3 skills +
     seniority + ubicación. `requirements` / `objectives` / `responsibilities` NO entran a
     la query, solo al scoring.
   - Por variante pide hasta **3 páginas** de Serper. Universo teórico: 4 × 3 × 10 = 120
     perfiles por búsqueda.
   - Un clic de "Buscar más candidatos" consume hasta **5 pasos** (`MAX_STEPS_PER_CLICK`)
     hasta juntar 10 nuevos o topar.
3. `searchLinkedInCandidates()` (`domain/linkedin-search.ts`) llama a Serper
   (`google.serper.dev/search`) con el query X-Ray + `gl` inferido del texto. Si no hay
   `SERPER_API_KEY`, cae a un mock determinístico.
4. Dedup contra el pool: `findExistingLinkedinUrls(orgId, urls)` — **solo por `linkedinUrl`
   normalizada**. Se ejecuta ANTES del scoring de IA.
5. Scoring: `scoreApplicationsBatch()` — **una sola llamada** a Gemini para toda la tanda
   de nuevos (`src/lib/ai`, provider Gemini, cascada flash → pro).
6. Persistencia: `sourcing_search_sessions` (schema `src/db/schema/index.ts:1002`), única
   por `(job_id, profile_id)` — **por reclutador, no por organización**. Guarda el cursor
   (`attempt`), el array acumulado de resultados y las métricas de la última tanda.

## Dónde NO hay límite

- No existe ningún contador de uso, cuota ni gate de plan para Sourcing con IA.
- `MAX_STEPS_PER_CLICK = 5` y `MAX_SEARCH_STEPS = 12` limitan **una búsqueda individual**,
  no el volumen total de búsquedas de una cuenta en un período.
- El único gate es el rol (`can(role, "candidates.manage")`).

## Costo

- Serper (hoy): tarifa baja de resultados de Google.
- Gemini scoring: 1 llamada batch por tanda ≈ fracción de centavo.
- Proveedor de enriquecimiento de LinkedIn (a incorporar, cambio aparte): modelo tipo
  HarvestAPI ≈ USD 0,10 por página de búsqueda (25 perfiles) + USD 0,004 por perfil
  enriquecido ⇒ **≈ USD 0,12–0,20 por tanda de 10**.
- Escenario de riesgo: power user con 5–8 tandas por búsqueda × 15–25 búsquedas activas/mes
  ⇒ **USD 10–40/mes de costo variable** sobre un plan de **USD 29,99**.

## Infraestructura de facturación que ya existe

- `plans` (`schema:374`): `code`, `name`, `workspace_type`, `price`, `currency`,
  `trial_days`, `max_members`, `active`, `sort_order`. **No hay campo de cuota de uso.**
- `subscriptions` (`schema:398`): 1:1 con `organizations`, `status` (pending / trialing /
  active / past_due / cancelled), `trial_ends_at`, `current_period_ends_at`. Provider
  `dlocal_go`.
- `subscription_payments` (`schema:425`): histórico de cobros de dLocal Go. Un cobro por
  suscripción; el webhook trae `payment_id`.
- **No hay** tabla de consumo/uso, ni concepto de "add-on" o "pack de recarga".

## Huecos de dedup detectados (relevantes para el control de costo)

1. `findExistingLinkedinUrls` matchea solo por `linkedinUrl` — un candidato del pool
   cargado por CV (sin LinkedIn vinculado) no se detecta. El proyecto YA tiene
   `computeDuplicates` / `dupKeysOf` (`candidates/domain/duplicate-keys.ts`) que matchea
   por **email + linkedin** — reusable.
2. `seenKeys` vive en `sourcing_search_sessions` scopeado por `profile_id` ⇒ otro
   reclutador de la misma organización vuelve a ver (y potencialmente a pagar por) los
   mismos perfiles.
3. No hay caché de perfiles ya enriquecidos: dos búsquedas solapadas pagan dos veces.

## Restricciones del proyecto que aplican

- Toda tabla de dominio lleva `organization_id` + RLS.
- Autorización primaria en `domain/`, RLS de respaldo.
- Lógica de negocio nunca en actions ni componentes.
- Cambios de schema: editar schema TS → `pnpm db:generate` → `pnpm db:migrate` → commitear
  schema + migración juntos.
- Deduplicar auth/datos por request con `cache()`; una transacción, no N.
- Cualquier cambio visual pasa por el skill `impeccable`.
- Strict TDD: test del caso de uso junto con el caso de uso.
