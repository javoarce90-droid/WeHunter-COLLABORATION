# Tareas — Sourcing con IA sobre HarvestAPI

**Change:** `integrar-harvestapi-sourcing`
**Basado en:** `design.md` (approved). TDD estricto — cada tarea de implementación va con su
test primero, no después (`.claude/rules/collaboration.md`, `CLAUDE.md`: Strict TDD Mode).

> Orden pensado para poder mergear en pasos chicos y probables (cada bloque deja el sistema
> funcionando): primero la interface + Serper movido (sin romper nada), después HarvestAPI
> detrás del flag, recién al final se apaga Serper por default.

---

## 1. Interface y tipos base ✅ 2026-09-14

- [x] `SourcingFilters`, `SourcingProviderCandidate`, `ProviderExperience/Education/Certification/Language`,
      `SourcingProviderResult`, interface `SourcingProvider` — `domain/sourcing-provider.ts`
      (design.md §2). Solo tipos, sin lógica — sin test dedicado.
- [x] Extender `ScoredLinkedInCandidate` en `sourcear-para-busqueda.ts` para que sea
      `SourcingProviderCandidate & {score, summary, breakdown, strengths, redFlags}`.

## 2. Mover Serper a `SerperProvider` (sin cambiar comportamiento) ✅ 2026-09-14

- [x] Test: adaptados (`serper-provider.test.ts`, reemplaza a `linkedin-search.test.ts`) —
      mismo comportamiento (X-Ray, `gl`, fallback determinístico) cubierto, más nuevos tests
      del método `SerperProvider.search()`.
- [x] Movido `searchLinkedInCandidates`, `buildLinkedInXRayQuery`, `inferGoogleCountryCode`,
      `DEMO_PROFILES` a `data/serper-provider.ts`. `SerperProvider implements SourcingProvider`.
      Candidatos mapeados con `experience: []`, `education: []`, `certifications: []`,
      `languages: []`, `email: null`.
- [x] Borrado `domain/linkedin-search.ts` y su test viejo.
- **Desviación de diseño, ya resuelta** (ver nota en `state.yaml`): `searchLinkedInCandidates(query, page)`
      se mantuvo como función separada (usada por `sourcear-para-busqueda.ts`), en paralelo al
      método `SerperProvider.search(filters, maxResults, exclude)` de la interface — no se
      unificaron, a la espera de resolver paginación. El cambio de producto 2026-09-14
      (design.md §1.1, sin "Buscar más") saca ese bloqueo: la unificación es directa ahora,
      queda como parte del grupo 3.

## 3. `get-sourcing-provider.ts` — selección de proveedor ✅ 2026-09-14

- [x] Test (`get-sourcing-provider.test.ts`): sin `APIFY_API_TOKEN` → `serper`; con token y sin
      `SOURCING_PROVIDER=serper` → `harvest`; con `SOURCING_PROVIDER=serper` (aunque haya
      token) → `serper`. Testeado sobre `resolveSourcingProviderKind` (lógica pura), no sobre
      instancias reales — `HarvestApiProvider` todavía no existe (grupo 4).
- [x] Implementado `get-sourcing-provider.ts` (design.md §5) — con token, hoy devuelve
      `SerperProvider` igual (placeholder temporal documentado con `console.warn` + TODO,
      hasta que exista `HarvestApiProvider`).
- [x] Simplificado `sourcear-para-busqueda.ts` (cambio de producto 2026-09-14, design.md §1.1):
      sacados `SourcingCursor`, `stepToVariantPage`, `SOURCING_MAX_QUERY_ATTEMPTS`,
      `SEARCH_PAGES_PER_VARIANT`, `MAX_SEARCH_STEPS`, `MAX_STEPS_PER_CLICK`,
      `buildJobSourcingQueryVariant`/`buildJobSourcingQuery`, `mergeSourcingBatch`. Nueva
      firma `sourcearParaBusqueda(job, maxResults, deps)`: una sola llamada a
      `deps.search(filters, maxResults, [])` (filtros armados por `jobToSourcingFilters`,
      nueva), dedup contra el pool y scoring en batch, sin cursor/merge. Tests reescritos en
      `sourcear-para-busqueda.test.ts` (los de `buildJobSourcingQueryVariant`/
      `mergeSourcingBatch` se borraron, ya no aplican).
- [x] `actions.ts`: `sourcearParaBusquedaAction(jobId, step)` → `sourcearParaBusquedaAction(jobId, maxResults)`,
      cableado a `getSourcingProvider().search(...)` (ya no a `searchLinkedInCandidates`
      directo). Sin merge/cursor de sesión — guarda el resultado de la búsqueda tal cual.
      `exclude` se pasa vacío (`[]`): no hay forma de conocer de antemano las claves del pool
      antes de la llamada (ver nota en `domain/sourcing-provider.ts`); el filtrado contra el
      pool ocurre después, con `findExistingLinkedinUrls` (sin cambios).
- [x] `AiJobSourcingResults.tsx`: ajuste mínimo de compilación (no el rediseño del grupo 11) —
      sacado `MAX_SEARCH_STEPS`/`exhausted`/`buscarMas()`, `buscar()` ahora llama a la action
      con `SOURCING_MAX_RESULTS` fijo (el selector de cantidad del stepper es tarea del grupo
      11). "Limpiar" no se tocó, seguía funcionando igual.
- **Hallazgo**: `limpiarSourcingSessionAction`/`deleteSourcingSession` (botón "Limpiar") **ya
  existían** en el código antes de este change — no hace falta crear nada nuevo para eso en el
  grupo 10, ya está. Falta confirmar con el usuario si el grupo 10/11 todavía tienen trabajo
  real (ver `state.yaml`).

## 4. `HarvestApiProvider` ✅ 2026-09-14

- [x] Campo de skills: no confirmado en el input schema relevado — se mandan como
      `searchQuery` (texto libre, junto con `seniority`), complementando los filtros duros
      (`currentJobTitles`, `locations`). Documentado en `harvest-api-provider.ts` como
      asunción a validar contra una llamada real con token.
- [x] Test + implementación: mapeo de respuesta cruda (`profileScraperMode: "Full"`) a
      `SourcingProviderCandidate[]` (`harvest-api-provider.test.ts`, 9 tests) — endorsements
      explícitamente ignorados. Nombres de campo DENTRO de experience/education/
      certifications/languages son una asunción razonable (no 100% confirmados, design.md
      §11) — mapeo defensivo con alias, documentado en cabecera del archivo.
- [x] Test + implementación: `costUsd = 0.10 + maxItems * 0.004` en llamada real; no se
      encontró costo real devuelto por Apify en la respuesta de la prueba — queda como
      estimación, documentado.
- [x] Test + implementación: sin `APIFY_API_TOKEN` o con falla de red/respuesta no-ok →
      fallback determinístico (perfiles ficticios con experiencia/educación/certificaciones/
      idiomas poblados, a diferencia del fallback de Serper que los deja vacíos).
- [x] Cableado en `get-sourcing-provider.ts`: `getSourcingProvider()` devuelve
      `new HarvestApiProvider(process.env.APIFY_API_TOKEN)` cuando corresponde — sacado el
      placeholder/`console.warn` temporal. Test agregado (`get-sourcing-provider.test.ts`).
- Verificado independientemente: `pnpm typecheck`, `pnpm test` (928/928), `eslint` sobre los
  archivos tocados — todo en verde.

## 5. Eliminar Sourcing Manual ✅ 2026-09-14

- [x] Borrado `ui/LinkedInSourcingTab.tsx` (sin tests propios).
- [x] Borrados `buscarLinkedinAction` y `scorearCandidatoSourcingAction` de `sourcing/actions.ts`.
      También `scoreLinkedInCandidate`/`SOURCING_MANUAL_SCORE_CAP` en `sourcear-para-busqueda.ts`
      (solo los usaba Sourcing Manual) y el campo `scoreApplication` de `SourcearParaBusquedaDeps`
      (ya no lo llamaba nadie). Tests de `scoreLinkedInCandidate` borrados en
      `sourcear-para-busqueda.test.ts`.
- [x] Simplificado `SourcingView.tsx`: sin selector de tabs, renderiza directo `AiSourcingTab`.
- [x] Verificado con `rg` — sin referencias muertas. README.md reescrito (describía
      extensivamente el flujo Manual y la arquitectura vieja con `linkedin-search.ts`).
- Verificado independientemente: `pnpm typecheck` limpio, `pnpm test` 926/926 (928 - 2 tests de
  `scoreLinkedInCandidate` borrados).

## 6. Dedup extendido a email ✅ 2026-09-14

- [x] Implementada `findExistingCandidateKeys(organizationId, {linkedinUrls, emails})` en
      `candidates.queries.ts` — una sola query (OR de ambas claves), generaliza
      `findExistingLinkedinUrls` (que queda sin uso — no se borró, sigue exportada; a decidir
      si se retira en una limpieza posterior). Sin test unitario propio, siguiendo la
      convención ya existente del archivo: `findDuplicateCandidate`/`findExistingLinkedinUrls`/
      `findExistingEmails` tampoco lo tienen (queries acopladas a `db.rls`, no testeadas
      unitariamente en este proyecto).
- [x] Cableada en `sourcear-para-busqueda.ts`: el loop de dedup del resultado de búsqueda ahora
      chequea `linkedinUrl` **y** `email` (antes solo URL) — `SourcearParaBusquedaDeps` cambió
      de `findExistingLinkedinUrls` a `findExistingCandidateKeys`. Test nuevo: "filtra por
      email cuando el candidato no matchea por LinkedIn"; tests existentes adaptados a la
      firma nueva.
- [x] `importarSourcingResultadoAction` (`applications/actions.ts`) y `importarSourcingAction`
      (`sourcing/actions.ts`, mismo patrón, mismo bug potencial) ahora aceptan `email` y se lo
      pasan a `findDuplicateCandidate` (que ya soportaba ambas claves) y a `insertCandidate`
      (antes guardaba `email: null` siempre). Caller actualizado en
      `AiJobSourcingResults.tsx` (`importarUno`) para pasar `c.email` en ambos caminos.
- Nota: no se implementó la marca `DUPLICATE` en el registro de auditoría ni el aviso "ya está
  en tu Talent Pool" en la UI — eso es scope de los grupos 9 y 11 (eventos de consumo / UI),
  este grupo era solo el dedup técnico (ver directiva original).
- Verificado independientemente: `pnpm typecheck` limpio, `pnpm test` 927/927, `eslint` limpio
  en los archivos tocados.

## 7. Persistencia de currículum estructurado ✅ 2026-09-14

- [x] `insertCandidateResume(candidateId, resume)` en `candidates.mutations.ts` — inserta en
      `candidate_work_experiences`/`candidate_education`/`candidate_certifications`/
      `candidate_languages` en una sola transacción, con `candidateId`/`profileId: null`. Sin
      test unitario propio (convención ya establecida en el grupo 6 para este archivo — data
      layer acoplado a `db.rls`, no testeado unitariamente en este proyecto).
- [x] `mapearNivelIdioma` (`candidates/domain/mapear-nivel-idioma.ts`, +11 tests) — mapea el
      texto libre de HarvestAPI ("Native or bilingual proficiency", "Professional working
      proficiency", etc.) al enum `languageLevel` (basico/intermedio/avanzado/nativo), default
      `intermedio` para lo no reconocido.
- [x] Cableado en `importarSourcingResultadoAction` (`applications/actions.ts`) **y**
      `importarSourcingAction` (`sourcing/actions.ts`, mismo patrón — por consistencia con lo
      que ya hizo el grupo 6 en ambas) — solo al crear un candidato nuevo, no en el camino de
      duplicado (evita filas de currículum repetidas si el recruiter re-importa el mismo
      perfil). Zod schemas nuevos para experience/education/certifications/languages en ambas
      actions. Caller `AiJobSourcingResults.tsx` actualizado para propagar esos campos.

## 8. Caché de perfiles — no pagar dos veces ✅ 2026-09-14

- [x] Tabla `sourcing_provider_profiles` agregada a `db/schema/index.ts` (design.md §6.2).
- [x] `pnpm db:generate` → migración generada en
      `src/db/migrations/0123_glamorous_lord_tyger.sql` — **NO aplicada**. Revisada: solo
      `CREATE TABLE` + FK + 2 índices, nada de drift de otras tablas.
- [x] **Fix de revisión (orquestador, 2026-09-14)**: la migración auto-generada no traía
      política RLS — `pnpm db:generate` no la genera sola, es SQL a mano (mismo patrón que
      `sourcing_search_sessions` en `0113_brave_jamie_braddock.sql`, que sí la tiene). Agregado
      `ENABLE ROW LEVEL SECURITY` + `CREATE POLICY "tenant_isolation"` +
      `GRANT ALL ... TO authenticated` a la misma migración. **Pendiente que el usuario la
      revise y decida aplicarla** (`pnpm db:migrate`, zona sensible —
      `.claude/rules/database.md`).
- [x] `pnpm db:migrate` contra la base real — aplicada 2026-09-14, verificada contra la base
      (columnas, `RLS ENABLED: true`, política `tenant_isolation`, 3 índices) con un script
      ad-hoc vía `postgres` (borrado después, no quedó en el repo).
- [x] Test + implementación: `findCachedProfile`/`upsertCachedProfile`
      (`data/sourcing-provider-profiles.{queries,mutations}.ts`). El chequeo va DESPUÉS de
      `SourcingProvider.search()`, no antes (ver "Aclaración de mecánica" en design.md §6.2 —
      HarvestAPI ya cobró el perfil dentro de la búsqueda; esto decide si se le cobra crédito
      al cliente, no si se le paga al proveedor). Un duplicado del Talent Pool NUNCA consulta
      la caché (siempre `DUPLICATE`). Todo candidato nuevo procesado se cachea (refresca
      `fetchedAt`), sea `NEW_PROFILE` o `REUSED_PROFILE`. 3 tests nuevos en
      `sourcear-para-busqueda.test.ts`.
- [x] TTL configurable: `SOURCING_PROFILE_CACHE_TTL_DAYS = 45`
      (`domain/sourcing-provider-cache.ts`, punto medio del rango 30–60 confirmado) — export
      propio, no hardcodeado en la query.

## 9. Eventos de consumo (seam) ✅ 2026-09-14

- [x] `SourcingConsumptionEvent`/`recordSourcingConsumption` (no-op + `console.info`,
      `domain/sourcing-consumption-event.ts`, design.md §7).
- [x] Cableado en `sourcearParaBusqueda`: un evento por candidato devuelto por el proveedor
      (`NEW_PROFILE` o `DUPLICATE` según si matchea el pool), costo prorrateado en partes
      iguales (`SourcingProviderResult.costUsd / candidates.length` — no viene desglosado por
      candidato). Un evento `FAILED` (candidateKey `"(search)"`, costo 0) cuando la búsqueda
      entera falla. Sin eventos cuando no hay candidatos. 4 tests nuevos en
      `sourcear-para-busqueda.test.ts`. `REUSED_PROFILE`/`PROFILE_REFRESH` quedan para cuando
      el grupo 8 implemente el chequeo de caché.
- [x] `recordConsumption` cableado en `actions.ts` a la implementación real (antes solo el
      tipo/no-op), con `organizationId`/`jobId` cerrados por closure.

## 10. Ampliar sesión de sourcing ✅ 2026-09-14

**"Limpiar" ya existe** (`limpiarSourcingSessionAction` → `deleteSourcingSession`,
`sourcing-sessions.mutations.ts:50`, ya cableada en `AiJobSourcingResults.tsx` — verificado
2026-09-14, no era necesario crearla). Este grupo quedó reducido a los campos nuevos:

- [x] `sourcing_search_sessions.results` (jsonb) — el `.$type<>()` inline en
      `db/schema/index.ts` estaba **desactualizado**: le faltaban `email`, `experience`,
      `education`, `certifications`, `languages` (quedó de antes de que el candidato tuviera
      esos campos) y el comentario decía "array ACUMULADO" cuando ya no hay acumulación entre
      tandas (design.md §1.1). Corregido para reflejar exactamente el shape actual de
      `ScoredLinkedInCandidate` — sin importar ese tipo desde `db/schema` (capa de datos no
      depende de dominio/feature), duplicado a mano como ya estaba. **Sin test de runtime
      nuevo**: no hay lógica de dominio propia que testear acá — jsonb en Postgres persiste
      cualquier objeto serializable tal cual, el riesgo real era el drift de tipos, ya cerrado
      por `pnpm typecheck` en verde de punta a punta (`sourcearParaBusqueda` →
      `saveSourcingSession`/`getSourcingSession`). No requirió `pnpm db:generate` — es un
      cambio de tipo TypeScript, no de columna SQL (sigue siendo `jsonb`).
- [x] Cambio de producto 2026-09-14 (design.md §1.1): la columna `attempt` (cursor de
      "Buscar más") ya dejó de tener un valor con sentido escrito por `sourcearParaBusquedaAction`
      (hecho en el grupo 3) — se deja deprecated, no se migra (decisión ya tomada, design.md
      §11).

## 11. UI — selector de cantidad y detalle clickeable ✅ 2026-09-14

**"Limpiar" ya existía en la UI**, no hubo que agregarlo.

- [x] Pasado por el skill `impeccable` (orquestador, no delegado — regla dura del proyecto).
      `context.mjs` corrido, DESIGN.md/PRODUCT.md leídos, `craft-floor.md` cargado antes de
      editar JSX.
- [x] Reemplazado "Buscar más candidatos" por: `QuantityStepper` (stepper 1–10, local a
      `AiJobSourcingResults.tsx`, calcado del prototipo) + botón único "Buscar candidatos" que
      pasa `quantity` a `sourcearParaBusquedaAction`.
- [x] Detalle expandible **inline** (no modal — `ResumeDetail` en `SourcingCandidateCard.tsx`,
      colapsable con `<button aria-expanded>`), funciona en cualquier ancho de contenedor por
      construcción (no depende de layout de página, es parte del flujo de la card). Solo se
      muestra si hay contenido real (`hasResumeContent`) — en modo Serper/demo (arrays vacíos)
      no aparece, sin regresión visual.
- [x] `pnpm typecheck` limpio, `pnpm test` 945/945 sin regresiones, detector de diseño
      (`detect.mjs`) sin hallazgos en ambos archivos. Un falso positivo de tamaño de fuente
      (`text-[11px]`, ya usado en 52 archivos del proyecto, dentro del rango "Label/caption"
      de DESIGN.md) suprimido con `ignore-value`.
- [x] Verificado en el navegador contra el dev server ya corriendo (login persistido): stepper
      funciona (clamp 1–10, focus visible), búsqueda real dispara y trae resultados, "Limpiar"
      + persistencia de sesión entre reloads confirmada de punta a punta.
- **Sin verificar visualmente en vivo**: la sección `ResumeDetail` en sí (el `SERPER_API_KEY`
  configurado en este entorno pega contra la API real de Serper, que no trae
  experiencia/educación — nunca dispara `hasResumeContent`; no hay `APIFY_API_TOKEN` para
  probar el fallback de `HarvestApiProvider`, que sí la pobla). Se descartó inyectar datos
  ficticios en el código del proveedor real para forzar el caso (una vez tocando el path
  mock, otra vez el path live con nombres reales de LinkedIn — ninguna de las dos me pareció
  correcta). Cubierto por: tipos (`tsc` verifica el shape exacto), los 9 tests de
  `harvest-api-provider.test.ts` (confirman que el fallback puebla los 4 arrays), y el
  detector de diseño. Pendiente: una verificación visual real cuando haya un token de
  HarvestAPI (o Apify) configurado.

## 12. Variables de entorno y limpieza final ✅ 2026-09-14

- [x] Agregados `APIFY_API_TOKEN` y `SOURCING_PROVIDER` a `.env.example`, con comentario
      explicando el flag de reversión.
- [x] `rg -n "SERPER_API_KEY"` — confirmado: solo `SerperProvider`, su test, y documentado en
      el README de la feature. Nada más asume que es el proveedor activo.
- [x] `pnpm typecheck` y `pnpm test` (945/945) limpios. `pnpm lint` completo sigue con los
      ~1580 errores preexistentes no relacionados (documentado desde el primer bloque); lint
      escopeado a los archivos de este change, limpio.

---

## Fuera de este change (no son tareas de acá)

- Implementar el consumo real de créditos — corresponde a `limitar-sourcing-ia` (`apply`
  cuando llegue), este change solo deja el seam listo (§9).
- Cotizar la API directa de HarvestAPI — decisión ya cerrada, Apify queda de default
  (proposal.md §3.1).
