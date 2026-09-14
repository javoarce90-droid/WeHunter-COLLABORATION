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

## 7. Persistencia de currículum estructurado

- [ ] Test: `insertCandidateResume(candidateId, resume)` inserta en
      `candidate_work_experiences`/`candidate_education`/`candidate_certifications`/
      `candidate_languages` en una sola transacción, con `candidateId` (no `profileId`).
- [ ] Implementar `insertCandidateResume` en `candidates.mutations.ts`, reusando
      `ExperienceFields`/`EducationFields`/`CertificationFields` de
      `candidate/profile/data/resume.mutations.ts` (design.md §6).
- [ ] Definir la tabla de mapeo de niveles de idioma (texto libre de HarvestAPI → enum
      `languageLevel`) — con test de los casos conocidos (Native/Professional/etc.) y un
      default razonable para valores no mapeados.
- [ ] Integrar `insertCandidateResume` en el flujo de importación de Sourcing (después de
      `insertCandidate`, misma transacción si es posible).

## 8. Caché de perfiles — no pagar dos veces

- [ ] Agregar tabla `sourcing_provider_profiles` al schema Drizzle (design.md §6.2).
- [ ] `pnpm db:generate` → revisar el SQL generado a mano antes de aplicar
      (`.claude/rules/database.md` — zona sensible).
- [ ] `pnpm db:migrate` contra la base real.
- [ ] Test: perfil dentro del TTL configurado → se reusa, no se llama al proveedor, evento
      `REUSED_PROFILE`.
- [ ] Test: perfil fuera del TTL → se vuelve a pedir al proveedor, evento `NEW_PROFILE`.
- [ ] Implementar el chequeo de caché antes de invocar `SourcingProvider.search()`.
- [ ] Definir el TTL exacto dentro de 30–60 días como configuración (no hardcodeado).

## 9. Eventos de consumo (seam)

- [ ] Test: `sourcearParaBusqueda` llama a `recordSourcingConsumption` una vez por candidato
      procesado (nuevo/reusado/duplicado), con el `type` y `costUsd` correctos.
- [ ] Implementar `recordSourcingConsumption` (no-op + log, design.md §7) e integrarlo en
      `sourcear-para-busqueda.ts`.

## 10. Ampliar sesión de sourcing

**"Limpiar" ya existe** (`limpiarSourcingSessionAction` → `deleteSourcingSession`,
`sourcing-sessions.mutations.ts:50`, ya cableada en `AiJobSourcingResults.tsx` — verificado
2026-09-14, no era necesario crearla). Este grupo queda reducido a los campos nuevos:

- [ ] Test: `sourcing_search_sessions.results` persiste y relee los campos nuevos
      (`email`, `experience`, `education`, `certifications`, `languages`) sin pérdida.
- [ ] Actualizar tipos y `sourcing-sessions.{queries,mutations}.ts`.
- [x] Cambio de producto 2026-09-14 (design.md §1.1): la columna `attempt` (cursor de
      "Buscar más") ya dejó de tener un valor con sentido escrito por `sourcearParaBusquedaAction`
      (hecho en el grupo 3) — pendiente solo decidir en la migración si se retira o se deja
      deprecated (ver design.md §11).

## 11. UI — selector de cantidad y detalle clickeable

**"Limpiar" ya existe en la UI**, no hay que agregarlo. Queda:

- [ ] Pasar por el skill `impeccable` antes de tocar JSX (regla dura del proyecto — CLAUDE.md).
- [ ] Reemplazar el botón "Buscar más candidatos" (ya sacado del dominio en el grupo 3, la UI
      todavía llama con `SOURCING_MAX_RESULTS` fijo) por: selector de cantidad (stepper 1–10,
      calcado del prototipo `https://claude.ai/artifact/MkCJ4AvdpCSgnQ8DXZQiPr`) + un solo
      botón "Buscar candidatos" que le pase esa cantidad a `sourcearParaBusquedaAction`.
- [ ] Diseñar el detalle expandible (acordeón o modal secundario, no columnas — no entra en
      el panel lateral `max-w-xl` de `SourcingIADialog`).
- [ ] Implementar en `AiJobSourcingResults.tsx`, verificar que funciona igual desde la tab de
      Sourcing y desde Postulados (mismo componente, dos entradas).
- [ ] Probar manualmente en el navegador ambos anchos (página completa y panel lateral) antes
      de dar por cerrado — regla de frontend del proyecto.

## 12. Variables de entorno y limpieza final

- [ ] Agregar `APIFY_API_TOKEN` y `SOURCING_PROVIDER` a `.env.example` (con comentario
      explicando el flag de reversión).
- [ ] `rg -n "SERPER_API_KEY"` — confirmar que solo queda referenciado desde `SerperProvider`,
      no desde ningún otro punto que asuma que es el proveedor activo.
- [ ] `pnpm lint && pnpm typecheck && pnpm test` — antes de cualquier commit
      (`.claude/rules/collaboration.md`).

---

## Fuera de este change (no son tareas de acá)

- Implementar el consumo real de créditos — corresponde a `limitar-sourcing-ia` (`apply`
  cuando llegue), este change solo deja el seam listo (§9).
- Cotizar la API directa de HarvestAPI — decisión ya cerrada, Apify queda de default
  (proposal.md §3.1).
