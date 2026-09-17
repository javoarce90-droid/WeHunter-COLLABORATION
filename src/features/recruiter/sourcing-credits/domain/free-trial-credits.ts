/**
 * Créditos totales de Sourcing externo del período de prueba (14 días) — `proposal.md` §4.6,
 * `design.md` §13. Caso especial: NO son un `credit_budget` de plan (el Free Trial no tiene
 * fila en `plans`), no se renuevan ni se acumulan, y se siembran una sola vez al crear la
 * organización (`onboarding/data/onboarding.mutations.ts`).
 */
export const FREE_TRIAL_SOURCING_CREDITS = 10;
