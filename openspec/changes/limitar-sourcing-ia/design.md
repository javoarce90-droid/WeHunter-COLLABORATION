# Technical Design — Sourcing Credits

**Change:** `limitar-sourcing-ia` · **Based on:** `specs/sourcing-credits/spec.md` (approved),
`proposal.md` (approved), `ui-proto` (approved 2026-09-15 — client validated the credits
prototype, artifact `a7feb72b-dc07-4018-82e9-19dff94455c9`).

> Layering per `.claude/rules/architecture.md`: business rules in `domain/` (pure, testable,
> primary authorization), `data/` for Drizzle (RLS client unless explicitly a system task),
> `actions.ts` as the only entry point from UI. RLS is a backstop, never the only gate.

---

## 1. Scope recap

This change implements the credit ledger, consumption layer, and UI surfacing described in
`spec.md`. It plugs into the seam `integrar-harvestapi-sourcing` already left in place:
`src/features/recruiter/sourcing/domain/sourcing-consumption-event.ts` —
`recordSourcingConsumption()` is a no-op today; this change replaces its body with the real
implementation. The event *shape* (`SourcingConsumptionEventType`:
`NEW_PROFILE`/`REUSED_PROFILE`/`DUPLICATE`/`PROFILE_REFRESH`/`FAILED`) does not change.

Out of scope (unchanged from proposal.md §3): search/vacancy limits, other AI features, Phase-2
agents, provider selection/integration.

---

## 2. Data model

### 2.1 `plans.credit_budget` (new column)

Add `credit_budget: integer("credit_budget").notNull().default(0)` to the existing `plans`
table (`src/db/schema/index.ts:374`). Configuration, not code — matches how `trial_days` and
`max_members` already work on that table. Free Trial's "10 credits total, no renewal" is
**not** modeled here (see §13 — it is a special case, not a `credit_budget`).

### 2.2 `sourcing_credit_balances` (new table) — the ledger, one row per organization

```
sourcing_credit_balances
  id                   uuid pk
  organization_id      uuid fk -> organizations, unique (1:1, like subscriptions)
  included_balance     integer not null default 0   -- resets to active_credit_budget each cycle
  purchased_balance     integer not null default 0   -- pack credits, never expire
  active_credit_budget  integer not null default 0   -- FROZEN snapshot of plan.credit_budget,
                                                       -- only updated at cycle renewal (§4)
  cycle_ends_at         timestamp                     -- mirrors subscriptions.current_period_ends_at
                                                       -- at the moment of the last reset (audit/debug)
  low_balance_notified_at  timestamp                  -- last time the low-balance warning fired
                                                       -- this cycle (avoid re-notifying every action)
  created_at / updated_at
```

Three separate fields per the spec's explicit requirement ("Estructura de saldos — tres campos,
no uno") — `available_balance = included_balance + purchased_balance` is **computed**, never
persisted as its own column.

**Why `active_credit_budget` is frozen instead of reading `plans.credit_budget` live:** the spec
requires that a mid-cycle plan change (`applyPlanChange`,
`src/features/recruiter/billing/data/subscriptions.mutations.ts:99`) only takes effect on the
*next* renewal. `applyPlanChange` updates `subscriptions.planId` immediately (it has to — the
rest of the app needs the new plan's `max_members`/`workspaceType` right away). If credit checks
read `plan.credit_budget` through the live `planId`, an upgrade would silently grant the new
budget mid-cycle, which spec.md's "Upgrade a mitad de ciclo" scenario explicitly forbids. Freezing
the value at renewal time (§4) decouples credit budget from plan changes without touching
`applyPlanChange`.

### 2.3 `sourcing_credit_events` (new table) — audit log

One row per `recordSourcingConsumption()` call — this **is** the real body that replaces the
no-op. Matches spec.md's "Registro de consumo y costo real" field list:

```
sourcing_credit_events
  id                uuid pk
  organization_id    uuid fk -> organizations
  job_id             uuid fk -> jobs (nullable — the "(search)" FAILED event has no per-candidate job... actually job_id is always known, see §8)
  user_id            uuid fk -> profiles (who triggered it — "reclutador" today, "origen" in spec.md, admits other origins later without a schema change)
  candidate_key      text not null   -- linkedinUrl or email, normalized; "(search)" for search-level events
  event_type         sourcing_credit_event_type not null  -- pgEnum: NEW_PROFILE | REUSED_PROFILE | DUPLICATE | PROFILE_REFRESH | FAILED
  credits_charged    integer not null   -- 0 or 1 per event (NEW_PROFILE/DUPLICATE=1, REUSED_PROFILE/FAILED=0)
  credit_source      text   -- "included" | "purchased" | null (null when credits_charged = 0)
  provider_cost_usd  numeric(10,4)   -- real/estimated cost from SourcingProviderResult, prorated per candidate
  provider           text   -- "harvestapi" | "serper" (SourcingProviderResult doesn't carry this today — see §8 open item)
  occurred_at        timestamp not null
  created_at
```

Indexes: `organization_id` (+`occurred_at` for reporting), `job_id`.

This table is the source of truth for both what the customer was charged (`credits_charged`)
and the internal waste metric spec.md asks for (`provider_cost_usd` vs. credits charged —
computed in a report/query, not stored as a derived column).

### 2.4 Packs — no new table for MVP (see §10)

---

## 3. Generic consumption layer (proposal.md §6 / spec.md "Capa de consumo genérica")

Modeled now, implemented only for `sourcing_profile`, per the explicit anti-overengineering
guardrail in proposal.md §8 ("Sobre-diseñar la capa de consumo por Fase 2" — mitigation:
model the generic shape, implement only the one type that's needed).

- `sourcing_credit_balances`/`sourcing_credit_events` are written today as if
  `consumption_type = "sourcing_profile"` were implicit — **no `consumption_type` column is
  added in this change**. Adding one now, with a single always-`"sourcing_profile"` value, is
  exactly the abstraction-with-no-second-user proposal.md warns against (`architecture.md`:
  "no sobre-ingenierizar").
- What actually makes this "generic" per the spec's intent is at the **domain function**
  level, not the schema: `checkAndReserveCredit()`/`recordCreditConsumption()` (§6, §8) take a
  `consumptionType` parameter in their signature even though only `"sourcing_profile"` is a
  valid value today (enforced by a TS union type, not a DB constraint). When Phase 2 needs a
  second type, the column gets added then, with a real second caller to validate the shape
  against — not speculatively now.

---

## 4. Cycle renewal — hooking into the dLocal reconcile transaction

`included_balance` must reset to `active_credit_budget` (freshly re-read from
`plans.credit_budget` at that moment) exactly when a billing cycle renews. That moment is
already pinpointed in the codebase: `applyReconcileAsSystem`
(`subscriptions.system-mutations.ts:42`, webhook path) and `applyReconcile`
(`subscriptions.mutations.ts:42`, checkout-return path) both receive a `payment:
PaymentToRecord | null` — **non-null exactly when a new `COMPLETED` dLocal execution was
reconciled** (the pure function `reconciliarSuscripcion()` only returns a `paymentToRecord`
on that branch, `domain/reconciliar-suscripcion.ts:125-142`).

**Design decision:** extend both `applyReconcileAsSystem` and `applyReconcile` to, inside the
*same* `admin.transaction`/`db.rls(...)` block, when `args.payment` is present AND the insert
into `subscriptionPayments` actually inserted a new row (not an `onConflictDoNothing` no-op —
requires switching that insert to `.returning({ id: subscriptionPayments.id })` and checking
the result array length, since dLocal retries the webhook and must not double-reset credits):

```sql
UPDATE sourcing_credit_balances
SET included_balance = <freshly read plans.credit_budget for the org's current plan>,
    active_credit_budget = <same value>,
    cycle_ends_at = <patch.currentPeriodEndsAt>,
    low_balance_notified_at = NULL,
    updated_at = now()
WHERE organization_id = <org>
```

**Rejected alternative:** a separate cron/scheduled job that resets balances on a timer. Rejected
because the actual renewal moment is event-driven (dLocal's webhook, whenever it fires — not a
fixed calendar date), and a cron would either double-reset or lag behind the real cycle boundary.
Piggybacking on the existing reconcile transaction guarantees the reset is atomic with the
payment that justifies it, using a pattern (`admin.transaction`, `onConflictDoNothing` for
idempotency) already established in this exact file.

**Free Trial correction:** the reset only applies when `args.payment` is non-null, i.e. only on
a real paid cycle. The trial period never reaches this code path (no subscription record with a
completed execution yet), so trial credits are never touched by this hook — consistent with
spec.md's "no se renuevan ni se acumulan" (§13 covers how trial credits are seeded instead).

---

## 5. Plan change mid-cycle

`applyPlanChange` (`subscriptions.mutations.ts:99`) is **not modified**. It already updates
`organizations.workspaceType` and `subscriptions.planId` immediately (needed for
`max_members`/UI elsewhere) — `sourcing_credit_balances.active_credit_budget` simply isn't
touched by it, so it keeps reflecting the old plan's budget until §4's renewal hook runs on the
next cycle. This is exactly spec.md's "Upgrade a mitad de ciclo" scenario, satisfied with zero
new code in the plan-change path.

---

## 6. Atomic balance check-and-decrement (concurrency safety)

Spec.md requires ("Concurrencia en Teams — sin doble consumo") that concurrent Sourcing runs on
a shared Teams balance never push it negative. No existing precedent for a conditional atomic
decrement exists in this codebase (billing writes are simple `UPDATE ... SET` inside a
transaction, not concurrency-contested). New domain function:

```ts
// domain/consume-sourcing-credit.ts
export async function consumeSourcingCredit(
  organizationId: string,
  amount: 1, // always 1 — one event = one profile
): Promise<{ ok: true; source: "included" | "purchased" } | { ok: false }>
```

Backing query (`data/sourcing-credit-balances.mutations.ts`), single round-trip, no
read-then-write race:

```sql
UPDATE sourcing_credit_balances
SET included_balance = GREATEST(included_balance - 1, 0),
    purchased_balance = purchased_balance - GREATEST(1 - included_balance, 0)
WHERE organization_id = $1
  AND (included_balance + purchased_balance) >= 1
RETURNING
  CASE WHEN included_balance > 0 THEN 'included' ELSE 'purchased' END AS source_before_decrement
  -- (exact expression refined at implementation time — the point is: one UPDATE...WHERE...RETURNING,
  -- no separate SELECT before it)
```

Zero rows returned = insufficient balance = `{ ok: false }`. Postgres row-level locking on the
single `UPDATE` makes this safe under concurrent callers without an explicit `FOR UPDATE` or
app-level lock — this is the same class of pattern as `onConflictDoNothing` already used for
idempotency in this codebase, applied to a numeric guard instead of a uniqueness guard.

**Known edge case, accepted (not solved further):** the pre-check in §7 caps `maxResults` to
the *optimistically read* available balance before calling the provider. If two concurrent
searches both read the same balance and both get capped to, say, 10, each may still attempt up
to 10 atomic decrements — the `UPDATE...WHERE` guard in this section stops the balance from
going negative, but the **second** search's later candidates will fail their decrement *after*
the provider (HarvestAPI) has already been called and billed externally for that profile. This
is unavoidable without pre-reserving credits before calling the provider (rejected below). When
this happens, `recordSourcingConsumption` (§8) still emits the event with `credits_charged: 0`
and a new `event_type` value is **not** invented for it — it's logged as a `FAILED` credit-debit
with the provider cost captured, so it's visible in the waste report (spec.md's own "costo
real/waste de WeHunter" metric already exists to surface exactly this).

**Rejected alternative — pre-reserve credits before calling the provider:** would require a
`reserved_balance` field and a release/commit step, adding real complexity for a race that (a)
only matters for Teams accounts with concurrent recruiters, (b) is self-limiting (bounded by
`maxResults ≤ 10` per call), and (c) the spec's own audit/waste tracking already absorbs. Not
worth the extra state per proposal.md §8's explicit anti-overengineering guidance.

---

## 7. Pre-check before execution — wiring into `sourcearParaBusquedaAction`

`sourcearParaBusquedaAction(jobId, maxResults)` (`sourcing/actions.ts:151`) already resolves
`membership.organizationId` before calling `sourcearParaBusqueda`. Insert, right after the
existing `job` lookup (`actions.ts:170-171`) and before `getSourcingProvider()`/
`sourcearParaBusqueda(...)`:

```ts
const available = await getAvailableSourcingBalance(membership.organizationId);
if (available <= 0) {
  return { ok: false, error: "insufficient_credits", available: 0 }; // UI shows the 2-action blocked state
}
const cappedMaxResults = Math.min(maxResults, available);
// ... call sourcearParaBusqueda(job, cappedMaxResults, deps) instead of the raw maxResults
```

The return type gains a discriminant so the UI can render spec.md's "Tenés 7 créditos... Buscar
7 candidatos / Comprar créditos" copy instead of a generic error — exact shape left to `tasks.md`
(likely `{ ok: false; error: "insufficient_credits"; available: number }` vs. today's plain
`{ ok: false; error: string }`).

`getAvailableSourcingBalance` is a plain read (`included_balance + purchased_balance`), **not**
the atomic decrement from §6 — the real guard against overspend is the per-event decrement in
§8, this is only the UX-facing "don't even ask the provider for more than you can afford" cap.

---

## 8. Replacing the `recordSourcingConsumption` no-op

`src/features/recruiter/sourcing/domain/sourcing-consumption-event.ts` — the function signature
and `SourcingConsumptionEvent` type are unchanged (per the file's own header comment: "la forma
no cambia, solo el cuerpo"). New body:

```ts
export async function recordSourcingConsumption(event: SourcingConsumptionEvent): Promise<void> {
  const shouldCharge = event.type === "NEW_PROFILE" || event.type === "DUPLICATE";
  let creditSource: "included" | "purchased" | null = null;

  if (shouldCharge) {
    const result = await consumeSourcingCredit(event.organizationId, 1); // §6
    creditSource = result.ok ? result.source : null; // ok:false → charged 0, see §6's edge case
  }

  await insertSourcingCreditEvent({
    ...event,
    creditsCharged: creditSource ? 1 : 0,
    creditSource,
  });
}
```

**Open item for `tasks.md`:** `event.jobId` is already on `SourcingConsumptionEvent` (set by the
existing `deps.recordConsumption` call sites in `sourcear-para-busqueda.ts`), so
`sourcing_credit_events.job_id` is always populated — no nullable case in practice despite §2.3's
note; confirm this during implementation and drop the nullable comment if so.

**Open item:** `SourcingProviderResult` (the `SourcingProvider` interface from
`integrar-harvestapi-sourcing`) does not currently carry which provider produced a result
(`data/harvest-api-provider.ts` vs `data/serper-provider.ts`) as a field consumable here — either
thread a `provider: string` through `SourcingProviderResult`, or resolve it at the call site in
`actions.ts` (which already knows which provider `getSourcingProvider()` returned) and pass it
down to `recordConsumption`. Left for `tasks.md` to pick — small, mechanical either way.

---

## 9. Talent Pool before Sourcing — `MatchearPoolDialog` preselection

`MatchearPoolDialog({ jobs }: { jobs: JobOption[] })`
(`src/features/recruiter/candidates/ui/MatchearPoolDialog.tsx:44`) manages `open`/`jobId` as
internal `useState` — confirmed no prop today accepts a preselected job or an initial open state.

**Design:** add optional props `initialJobId?: string` and `initialOpen?: boolean`, defaulting to
today's behavior (`open=false`, empty `jobId`) when omitted — every existing call site keeps
working unchanged. `useState(initialOpen ?? false)` / `useState(initialJobId ?? "")`. The Sourcing
screen's "Ver candidatos del Talent Pool" action navigates to `/candidatos` with the dialog
rendered `initialOpen` + `initialJobId` set (via query param, read server-side and passed as a
prop — consistent with how the rest of the app avoids client-side-only navigation state), which
immediately triggers the same `matchearPoolConBusquedaAction(jobId)`
(`candidates/actions.ts:822`) that manual selection would — this reuses the domain function
`matchearPoolConBusqueda` (`sourcing/domain/matchear-pool-interno.ts:96`) as-is, satisfying
spec.md's "no dispara un nuevo scoring de IA" requirement for free (the caching behavior already
lives in that domain function, untouched by this change).

---

## 10. Packs purchase — one-off dLocal Go charge (OPEN — needs validation before `tasks.md`)

`src/features/recruiter/billing/data/dlocal-go.client.ts` only wraps **subscription**-shaped
endpoints (`/v1/subscription/...`) plus a read-only `getPayment`. Nothing in this codebase
creates a one-off charge today — proposal.md §8 flagged exactly this as a risk and asked design
to verify dLocal Go's one-off-charge support before committing to the pack-purchase flow.

**This design does not resolve that** — it's a dLocal Go product/API capability question, not a
WeHunter architecture decision, and answering it wrong here would just be guessing. Per
proposal.md §8's own fallback ("si no lo soporta simple, MVP con créditos incluidos + bloqueo, y
packs en una iteración siguiente"):

- **`tasks.md` should ship Phase 1 without pack purchase** (included credits + block-at-zero +
  the "Comprar créditos" CTA can render as **disabled/"próximamente"**, or simply omit the
  button) — this is a full, shippable, spec-compliant slice on its own (every other requirement
  in spec.md stands without packs existing yet).
- Packs become their own small follow-up once dLocal Go's one-off/payment-link capability is
  confirmed (their API docs, or a support question) — at that point `sourcing_credit_pack_purchases`
  (mirroring `subscriptionPayments`' shape: `dlocal_payment_id` unique for idempotency) gets
  added, plus the `purchased_balance` increment wired to that payment's confirmation webhook —
  same reconcile-transaction pattern as §4.

---

## 11. Low balance warning

`available_balance < 0.10 * active_credit_budget` (default threshold, configurable —
spec.md leaves the 10% as a default, not hardcoded forever; store it as an env/config value,
not a magic number in the query). Computed on read in the Sourcing screen (no new column needed
beyond `low_balance_notified_at`, which exists only to avoid re-showing a dismissible toast
every single action within the same cycle — exact UX left to `tasks.md`/UI).

---

## 12. Reversal switch (proposal.md §9 / spec.md "Interruptor de reversión")

A platform-level env flag (`SOURCING_CREDITS_ENABLED`, default `true`) checked in §7's pre-check:
when `false`, `getAvailableSourcingBalance` short-circuits to `Infinity` (never blocks) and §8's
`recordSourcingConsumption` still writes the audit event (`credits_charged: 0`, `creditSource:
null`) but skips the §6 decrement entirely — matches spec.md's explicit requirement that internal
controls (Talent Pool offer, audit registry) stay active even with the switch on.

---

## 13. Free Trial — 10 credits total, no `credit_budget` renewal

Trial workspaces don't have a `subscriptions` row with a completed payment yet (per
`evaluar-acceso-workspace.ts`'s model — trial is derived from `organizations.created_at`, no
subscription required). `sourcing_credit_balances` for a trial org is seeded once, at
organization creation (alongside whatever already provisions a new org), with
`included_balance = 10`, `active_credit_budget = 10`, and **never reset** by §4's hook (which
only fires on a real paid-cycle reconcile — trial orgs never reach that code path until they
convert). On conversion to a paid plan, the *first* real reconcile (§4) resets
`included_balance`/`active_credit_budget` to the paid plan's `credit_budget` — the unused trial
credits are simply overwritten, matching spec.md ("no se renuevan ni se acumulan").

---

## 14. Authorization

Primary check in `domain/` per `architecture.md`: `sourcearParaBusquedaAction` already gates on
`can(membership.role, "candidates.manage")` before this change touches anything — the credit
check in §7 sits inside that same authorized path, no new permission needed (spending credits is
part of running Sourcing, not a separate capability). `sourcing_credit_balances`/
`sourcing_credit_events` get standard tenant-isolation RLS (`organization_id` + `is_org_member`),
same pattern as every other domain table (`database.md`). The renewal hook (§4) runs through the
existing `admin`/RLS split already established per call site (webhook = `admin`, checkout-return
= RLS) — unchanged, this design only adds statements inside those existing transactions.

---

## 15. Rollback plan

Per proposal.md §9: the reversal switch (§12) is the primary rollback — flip
`SOURCING_CREDITS_ENABLED=false`, no deploy of reverted code needed, Sourcing behaves as
unlimited immediately. If the schema itself needs rolling back (unlikely — additive tables/
columns only, nothing destructive), the new tables (`sourcing_credit_balances`,
`sourcing_credit_events`) and the `plans.credit_budget` column can be dropped without touching
any other table; no existing table gets a column removed or a type changed.

---

## 16. Summary of rejected alternatives

| Rejected | Why |
|---|---|
| Cron-based cycle reset | Renewal is event-driven (dLocal webhook timing), not calendar-driven; a cron would drift from the real cycle boundary. |
| Single `balance` column (no `included`/`purchased` split) | Spec explicitly requires knowing which credits expire vs. which don't — required for renewal (§4) and consumption order (spec.md "incluidos primero"). |
| `consumption_type` column added now for "genericness" | No second consumption type exists yet to validate the shape against — speculative generality `architecture.md` explicitly warns against. |
| Pre-reserve credits before calling the provider | Extra state (`reserved_balance` + release/commit) for a narrow, bounded, already-auditable race condition (§6). |
| Reading `plans.credit_budget` live instead of a frozen snapshot | Would let a mid-cycle plan change silently change the budget mid-cycle, contradicting spec.md's explicit "Upgrade a mitad de ciclo" scenario. |

---

## 17. Open items carried into `tasks.md`

1. **dLocal Go one-off charge capability** (§10) — must be confirmed (docs or support question)
   before pack-purchase tasks can be scoped; Phase 1 tasks should ship without packs regardless.
2. Exact shape of `sourcearParaBusquedaAction`'s insufficient-balance return type (§7).
3. Whether `SourcingProviderResult` gains a `provider` field or the caller in `actions.ts`
   supplies it directly to `recordConsumption` (§8).
4. Confirm `sourcing_credit_events.job_id` is never actually null in practice (§8) and drop the
   nullable note from §2.3 if so.
