# Tareas — Créditos de Sourcing externo

**Change:** `limitar-sourcing-ia`
**Basado en:** `design.md` (approved). TDD estricto — cada tarea de implementación va con su
test primero, no después (`.claude/rules/collaboration.md`, `CLAUDE.md`: Strict TDD Mode).

> Orden pensado para mergear en pasos chicos y probables: primero el modelo de datos (sin
> lógica), después el motor de créditos aislado y testeado, recién al final se cablea al flujo
> real de Sourcing y a la UI. Cada bloque deja el sistema funcionando (Sourcing sigue
> ilimitado hasta que el grupo 4 lo cablea de verdad).

---

## 1. Schema — tablas y columna nuevas ✅ 2026-09-15

- [x] `plans.credit_budget` (integer, not null, default 0) agregado a `db/schema/index.ts`
      (design.md §2.1). Migración incluye un `UPDATE` de datos para los planes existentes:
      Freelancer → 250, Teams → 1.350 (proposal.md §4.6, codes confirmados contra el seed
      original en `0116_glamorous_vance_astro.sql`). Sin lógica de dominio, sin test.
- [x] `sourcing_credit_balances` (design.md §2.2): `organization_id` único (1:1), `included_balance`,
      `purchased_balance`, `active_credit_budget`, `cycle_ends_at`, `low_balance_notified_at`,
      timestamps. RLS tenant-isolation igual que el resto (`database.md`).
- [x] `sourcing_credit_events` (design.md §2.3): `organization_id`, `job_id`, `user_id`,
      `candidate_key`, `event_type` (pgEnum `sourcing_credit_event_type`: NEW_PROFILE |
      REUSED_PROFILE | DUPLICATE | PROFILE_REFRESH | FAILED), `credits_charged`,
      `credit_source`, `provider_cost_usd`, `provider`, `occurred_at`, `created_at`. Índices en
      `organization_id` (+`occurred_at`) y `job_id`. RLS tenant-isolation.
- [x] `pnpm db:generate` → `src/db/migrations/0124_perpetual_randall.sql`. Revisada: CREATE TYPE
      + 2 CREATE TABLE + 1 ALTER TABLE ADD COLUMN + 3 FKs + 3 índices, sin drift de otras
      tablas. RLS no salió sola (mismo gotcha que `integrar-harvestapi-sourcing` grupo 8) —
      agregado a mano `ENABLE ROW LEVEL SECURITY` + `CREATE POLICY "tenant_isolation"` + `GRANT`
      para ambas tablas, mismo patrón exacto que `0123_glamorous_lord_tyger.sql`. **Aplicada
      2026-09-15** (`pnpm db:migrate`, tras revisión del usuario) y verificada contra la base
      real: columnas, RLS habilitado + política `tenant_isolation` en ambas tablas, `plans`
      con `credit_budget` 250/1350, backfill 7/7 organizaciones con fila de saldo (una con
      suscripción Freelancer paga → 250, el resto en trial → 10).
- [x] `pnpm typecheck` limpio con el schema nuevo.

## 2. Motor de créditos — lectura y decremento atómico (aislado, sin cablear) ✅ 2026-09-15

- [x] `getAvailableSourcingBalance(organizationId)` — lee `included_balance + purchased_balance`
      (design.md §7). `data/sourcing-credit-balances.queries.ts`, cliente RLS. Sin test unitario
      propio (misma convención ya establecida en el proyecto para queries acopladas a `db.rls`
      sin lógica de negocio propia).
- [x] `consumeSourcingCredit(organizationId)` — implementado como una sola sentencia
      `WITH before AS (... FOR UPDATE) UPDATE ... FROM before ... RETURNING`
      (`data/sourcing-credit-balances.mutations.ts`, design.md §6, refinamiento del open item 2
      de design.md — el `RETURNING` de un `UPDATE` en Postgres solo ve columnas post-escritura,
      así que el CTE `before` captura `included_balance` ANTES del decremento para poder
      informar `source: "included" | "purchased"`, sin un SELECT separado que rompería la
      atomicidad). Sin test unitario, mismo motivo que arriba — confirmado con `rg` que ningún
      `.test.ts` del proyecto llama a `getDb()`/`db.rls`/`admin` hoy, no hay tests de
      integración contra base real en este repo.
- [x] `pnpm typecheck` y `eslint` sobre ambos archivos — limpio. Orden incluidos-primero y el
      escenario "Consumo que cruza ambos saldos" quedan verificados por revisión manual del SQL,
      pendiente de una verificación real contra la base una vez aplicada la migración.

## 3. Reemplazar el no-op de `recordSourcingConsumption` ✅ 2026-09-15

- [x] `shouldChargeCredit(type)` extraída como función pura testeable (única lógica de decisión
      separable del I/O) — `NEW_PROFILE`/`DUPLICATE` cobran, `REUSED_PROFILE`/`FAILED`/
      `PROFILE_REFRESH` no. 5 tests (`sourcing-consumption-event.test.ts`).
- [x] `recordSourcingConsumption` (`sourcing-consumption-event.ts`, design.md §8) — reemplazado
      el no-op: llama `consumeSourcingCredit` cuando `shouldChargeCredit`, siempre inserta
      `sourcing_credit_events` vía `insertSourcingCreditEvent` (nuevo,
      `sourcing-credits/data/sourcing-credit-events.mutations.ts`) con `creditsCharged`/
      `creditSource` según el resultado (incluido el caso `ok: false` del edge case de
      concurrencia — se audita con `creditsCharged: 0`, ver design.md §6). Sin test unitario
      propio del wrapper de I/O, mismo criterio que el grupo 2.
- [x] Resuelto el open item de `provider` (design.md §8, punto 2): agregado `provider: string`
      a `SourcingProviderResult` (interface `SourcingProvider`,
      `sourcing/domain/sourcing-provider.ts`) — cada provider hardcodea su propio nombre
      (`"harvestapi"`/`"serper"`) en sus 2 puntos de retorno (vivo + fallback) cada uno.
      Propagado a través de `sourcear-para-busqueda.ts` (`SourcearParaBusquedaDeps.recordConsumption`
      gana el campo) hasta el único call site en `sourcing/actions.ts`, que también agrega
      `userId: user?.id ?? null` (ya resuelto en el mismo scope, sin query nueva).
- [x] 17 mocks de `SourcingProviderResult` en `sourcear-para-busqueda.test.ts` actualizados con
      `provider`, más las 8 aserciones `toEqual` de eventos de consumo que ahora incluyen ese
      campo.
- [x] `pnpm typecheck`, `pnpm test` (950/950, +5 del test nuevo), `eslint` sobre los 9 archivos
      tocados — todo en verde, verificado independientemente.

## 4. Pre-check antes de ejecutar — cablear a `sourcearParaBusquedaAction` ✅ 2026-09-15

- [x] `evaluarSolicitudSourcing(requestedMaxResults, availableBalance)` — función pura nueva
      (`sourcing-credits/domain/evaluar-solicitud-sourcing.ts`), extraída para poder testear la
      decisión de negocio sin pasar por `actions.ts` (que en este proyecto nunca se testea
      unitariamente — confirmado con `rg`, cero `actions.test.ts` en el repo). Cap de
      `Math.min(requested, available)` cuando alcanza, `{ ok: false, available: 0 }` con saldo
      ≤ 0. 5 tests, incluido el escenario "Pide 10, tiene 7" de spec.md.
- [x] Cableado en `sourcearParaBusquedaAction` (`sourcing/actions.ts`), entre el lookup de `job`
      y `getSourcingProvider()`. Nuevo shape de retorno: `availableCredits?: number` (campo
      opcional, solo presente en `error === "insufficient_credits"` — decisión final del open
      item 2 de design.md, nombre distinto al borrador para no chocar con el `results` ya
      existente en la firma).
- [x] `sourcearParaBusqueda(...)` ahora recibe `evaluation.maxResults` (ya acotado), no
      `parsed.data.maxResults` crudo.
- [x] Verificado independientemente: `pnpm typecheck`, `pnpm test` (955/955, +5), `eslint`
      limpio en los 3 archivos tocados.

## 5. Renovación de ciclo — hook en la transacción de reconcile de dLocal ✅ 2026-09-15

- [x] Extendido `applyReconcileAsSystem` (`billing/data/subscriptions.system-mutations.ts`):
      el insert de `subscriptionPayments` pasa a `.returning({id: ...})` en vez de confiar en
      `onConflictDoNothing` a ciegas — `inserted.length > 0` distingue un cobro nuevo de un
      reintento del webhook. En un cobro nuevo, `renewSourcingCreditsOnNewPayment` (misma
      transacción) lee `plans.credit_budget` del plan VIGENTE (join manual vía
      `subscriptions.planId`, no un valor pasado como argumento) y lo congela en
      `sourcing_credit_balances.active_credit_budget`/`included_balance` (design.md §4, §5).
- [x] Mismo cambio, inline (sin extraer función — se usa una sola vez ahí), en `applyReconcile`
      (`billing/data/subscriptions.mutations.ts`, camino RLS del checkout-return).
- [x] `onConflictDoUpdate` en vez de un `UPDATE` liso en ambos — defensivo ante una org sin fila
      de saldo todavía (no debería pasar en producción, ver grupo 6, pero autocura en vez de
      perder la renovación en silencio).
- [x] Sin test unitario propio — mismo motivo que grupos 2 y 3 (mutations acopladas a
      `admin.transaction`/`db.rls`, sin tests de integración en este repo). La función PURA que
      sí tiene test (`reconciliarSuscripcion`, `reconciliar-suscripcion.test.ts`) no se tocó —
      esta tarea solo agrega efectos dentro de la transacción que consume su resultado.
      Escenarios "Renovación de un Freelancer" y "Upgrade a mitad de ciclo" (spec.md) quedan
      para verificación manual contra la base real, junto con el grupo 2.
- [x] Verificado independientemente: `pnpm typecheck`, `pnpm test` (955/955, sin regresiones),
      `eslint` limpio en ambos archivos.

## 6. Free Trial — semilla de créditos sin ciclo ✅ 2026-09-15

- [x] `FREE_TRIAL_SOURCING_CREDITS = 10` (`sourcing-credits/domain/free-trial-credits.ts`) —
      constante, no un número mágico repetido en dos lugares (código + migración).
- [x] Semilla cableada en `createOrganizationWithOwner`
      (`onboarding/data/onboarding.mutations.ts`) — dentro de la MISMA transacción que
      `create_organization_with_owner` (no una segunda llamada `db.rls` separada), justo
      después de confirmar el `organizationId`. `included_balance=10`, `active_credit_budget=10`,
      sin `cycle_ends_at` (design.md §13). El test de dominio existente
      (`onboarding/domain/crear-organization.test.ts`) inyecta `createOrganizationWithOwner`
      como dependencia — no se ve afectado por este cambio interno de la mutation.
- [x] **Hallazgo no previsto en el plan original**: las organizaciones que ya existían ANTES de
      esta migración quedarían sin fila de saldo — `getAvailableSourcingBalance` lee 0 y el
      grupo 4 bloquearía Sourcing para todas ellas hasta su próxima renovación real. Agregado un
      backfill al final de la migración del grupo 1
      (`0124_perpetual_randall.sql`): toda organización sin fila recibe `credit_budget` de su
      plan pago vigente si tiene uno, o los mismos 10 créditos de Free Trial si no
      (`LEFT JOIN subscriptions/plans` + `COALESCE(..., 10)`, `ON CONFLICT DO NOTHING`).
- [x] El hook de renovación del grupo 5 no toca una org en trial (nunca hay `payment` no-null
      hasta el primer cobro real) — ya garantizado por construcción (`args.payment` solo llega
      no-null desde `reconciliarSuscripcion` en el branch `COMPLETED`), sin test adicional por
      el mismo motivo del grupo 5.
- [x] Verificado independientemente: `pnpm typecheck`, `pnpm test` (955/955), `eslint` limpio.

## 7. Interruptor de reversión ✅ 2026-09-15

- [x] `sourcingCreditsEnabled()` (env `SOURCING_CREDITS_ENABLED`, default `true`,
      `sourcing-credits/domain/sourcing-credits-enabled.ts`) — función pura, 3 tests (default
      habilitado, `"false"` deshabilita, cualquier otro valor deja habilitado).
- [x] Cableado en `sourcearParaBusquedaAction`: en deshabilitado, `availableCredits = Infinity`
      en vez de leer la base — `evaluarSolicitudSourcing` no necesitó ningún cambio, `Math.min`
      con `Infinity` ya devuelve el pedido tal cual (grupo 4 nunca bloquea).
- [x] Cableado en `recordSourcingConsumption`: en deshabilitado, salta `consumeSourcingCredit`
      pero sigue llamando `insertSourcingCreditEvent` igual (design.md §12 — controles internos
      activos aunque el interruptor esté apagado).
- [x] Verificado independientemente: `pnpm typecheck`, `pnpm test` (958/958, +3), `eslint`
      limpio en los 4 archivos tocados.

## 8. Talent Pool antes de Sourcing — preselección en `MatchearPoolDialog` ✅ 2026-09-15

- [x] **Decisión de producto confirmada con el usuario** (no estaba resuelta en el spec): el
      banner de Sourcing NO dispara matching con IA automáticamente al cargar la pantalla — es
      un link fijo, sin conteo previo, que navega a `/candidates?matchPool=<jobId>`; el matching
      real corre recién ahí (mismo mecanismo manual que ya existía, ahora con la búsqueda
      preseleccionada). Evita un costo de IA nuevo en cada visita a Sourcing.
- [x] `MatchearPoolDialog`: props opcionales `initialJobId`/`initialOpen`, default al
      comportamiento actual (sin efecto en ningún caller existente). Un `useEffect` de montaje
      dispara `buscar()` automáticamente cuando abre preseleccionado — "ya visible", no un
      punto de partida vacío (spec.md).
- [x] Banner "Revisá tu Talent Pool antes de buscar afuera" en `AiJobSourcingResults.tsx`
      (estado pre-búsqueda) con el link "Ver candidatos del Talent Pool" →
      `/candidates?matchPool=<jobId>`.
- [x] Wiring del query param: `candidates/page.tsx` (`searchParams.matchPool`) →
      `CandidatesSection` → `CandidatesList` (`matchPoolJobId`) → `MatchearPoolDialog`. Reusa
      `matchearPoolConBusquedaAction`/`matchearPoolConBusqueda` sin cambios.
- [x] Sin test de dominio — es wiring de estado de UI puro. Verificado en el navegador (ver
      grupo 10): el link navega, el diálogo abre preseleccionado, dispara el análisis solo
      (sin elegir nada a mano), y devuelve un resultado real de `matchearPoolConBusqueda` sin
      tocar su lógica de caché existente.

## 9. Aviso de saldo bajo y saldo cero — lógica de dominio ✅ 2026-09-15

- [x] `debeAvisarSaldoBajo(available, activeCreditBudget, thresholdRatio = 0.1)` — función pura
      (`sourcing-credits/domain/evaluar-saldo-bajo.ts`), 7 tests: escenarios exactos de
      Freelancer (umbral 25) y Teams (umbral 135) de spec.md, umbral configurable, budget en 0
      (nunca avisa), saldo cero (siempre avisa).
- [x] Bloqueo de saldo cero — resto de WeHunter sigue operativo: verificado por inspección
      (`git diff --name-only` contra `src/lib/auth/session.ts` y
      `billing/domain/evaluar-acceso-workspace.ts` — el gate global de acceso al workspace —
      sin cambios), el chequeo de saldo vive únicamente dentro de `sourcearParaBusquedaAction`,
      no en ningún gate compartido. No hay una forma significativa de testear esto como test
      unitario (es una propiedad arquitectural, no lógica de una función), así que no se
      fabricó uno.
- [x] Verificado independientemente: `pnpm typecheck`, `pnpm test` (965/965, +7), `eslint`
      limpio.

## 10. UI — indicador de saldo, aviso, bloqueo y CTA de packs ✅ 2026-09-15

- [x] Pasado por el skill `impeccable` (regla dura del proyecto) — `context.mjs --target` corrido,
      PRODUCT.md/DESIGN.md leídos, `craft-floor.md` cargado antes de editar JSX.
- [x] `getSourcingCreditsBalanceAction` (nueva, `sourcing-credits/actions.ts`) +
      `getSourcingCreditsSnapshot` (nueva query, una sola consulta para saldo + budget —
      `database.md` "una transacción, no N") — cableado en `AiJobSourcingResults.tsx`, cargado
      junto con la sesión de trabajo en el mismo `Promise.all` dentro de `startHydrate` (evitó
      un error de lint `react-hooks/set-state-in-effect` al llamarlo suelto fuera de la
      transición).
- [x] Indicador de créditos disponibles + aviso de saldo bajo (usa `debeAvisarSaldoBajo` del
      grupo 9) en el estado pre-búsqueda.
- [x] Estado de saldo cero: mensaje + botón "Comprar créditos" deshabilitado (design.md §10 —
      packs no se implementan hasta confirmar soporte de cobro único de dLocal Go). El resto de
      la pantalla (banner de Talent Pool) sigue visible incluso bloqueado.
- [x] `sourcearParaBusquedaAction` extendido con `availableCredits` en la respuesta de error;
      `buscar()` en el cliente distingue `insufficient_credits` con mensaje propio y refresca el
      saldo. El indicador también se refresca después de una búsqueda exitosa (créditos recién
      consumidos).
- [x] **Verificado en el navegador contra el dev server real** (no solo compilación): banner de
      Talent Pool visible y funcional; indicador mostró "250 créditos disponibles" (dato real
      del backfill); una búsqueda real de 2 candidatos nuevos (`Analista Funcional`) descontó
      2 créditos de verdad (`included_balance` 250→248 en la base, 2 eventos `NEW_PROFILE`/
      `credits_charged: 1`/`credit_source: "included"` en `sourcing_credit_events`) y el
      indicador se actualizó a "248" sin recargar; el estado de saldo cero se verificó forzando
      `included_balance = 0` (restaurado después): mensaje correcto, botón "Comprar créditos"
      deshabilitado, sin stepper ni botón de búsqueda.
- [x] **Hallazgo aparte, no de este change**: `SourcingCandidateCard.tsx:26`
      (`hasResumeContent`) tira `TypeError` con una sesión de Sourcing guardada cuyo JSON no
      tiene `experience`/`education`/etc. poblados (dato legado de antes del fix de tipos de
      `integrar-harvestapi-sourcing` grupo 10). No se tocó — es un bug preexistente de otra
      feature/change ya cerrado, reportado al usuario, no corregido silenciosamente. La sesión
      corrupta puntual de este entorno se borró (dato efímero) para poder seguir probando.

## 11. Variables de entorno y limpieza final ✅ 2026-09-15

- [x] Agregado `SOURCING_CREDITS_ENABLED` a `.env.example` con comentario del flag de reversión
      (nota: `.env.example` está en `.gitignore` en este repo — `.env*` sin excepción — así que
      el cambio queda local, no aparece en ningún diff commiteable; documentado igual por
      consistencia con el resto del archivo).
- [x] `README.md` de la feature de sourcing revisado — no menciona el seam de consumo ni el
      no-op viejo, nada que actualizar ahí.
- [x] `pnpm typecheck` y `pnpm test` (965/965) limpios. ESLint escopeado a los 22 archivos
      `.ts`/`.tsx` tocados por este change hasta ahora — limpio (`pnpm lint` completo del repo
      sigue con los ~1580 errores preexistentes no relacionados, mismo estado documentado desde
      `integrar-harvestapi-sourcing`).

---

## Fuera de este change (no son tareas de acá)

- **Compra de packs de créditos** (design.md §10): bloqueada hasta confirmar si dLocal Go
  soporta cobros únicos (fuera del alcance de este código — hay que revisar su documentación o
  consultar soporte). Cuando se confirme, es un change chico aparte: tabla
  `sourcing_credit_pack_purchases` + wiring del webhook de confirmación + habilitar el CTA que
  el grupo 10 dejó deshabilitado/omitido.
- **Agentes de Fase 2** y el tipo de consumo genérico más allá de `sourcing_profile` — el
  modelo ya deja la puerta abierta (design.md §3) sin construir nada de agentes ahora.
