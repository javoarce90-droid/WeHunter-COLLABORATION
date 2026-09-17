import { HarvestApiProvider } from "../data/harvest-api-provider";
import { SerperProvider } from "../data/serper-provider";
import type { SourcingProvider } from "./sourcing-provider";

/**
 * Punto único para obtener el proveedor de datos de sourcing. Se elige acá según el entorno,
 * sin tocar a quien lo consume — mismo patrón que `getAiProvider()` (`src/lib/ai/index.ts`).
 *
 * - `SOURCING_PROVIDER=serper` es el interruptor de reversión (spec funcional, requisito "Plan
 *   de reversión a Serper"): fuerza Serper aunque haya `APIFY_API_TOKEN` configurado.
 * - Con `APIFY_API_TOKEN` y sin el flag → HarvestAPI.
 * - Sin token → Serper (no hay nada que elegir).
 */

export type SourcingProviderKind = "serper" | "harvest";

/** Lógica de selección pura, sin efectos — separada de `getSourcingProvider()` para poder
 *  testearla sin depender de si `HarvestApiProvider` ya existe. */
export function resolveSourcingProviderKind(
  env: Record<string, string | undefined>,
): SourcingProviderKind {
  if (env.SOURCING_PROVIDER === "serper") return "serper";
  return env.APIFY_API_TOKEN ? "harvest" : "serper";
}

let instance: SourcingProvider | null = null;

export function getSourcingProvider(): SourcingProvider {
  if (!instance) {
    const kind = resolveSourcingProviderKind(process.env);
    instance =
      kind === "harvest"
        ? new HarvestApiProvider(process.env.APIFY_API_TOKEN)
        : new SerperProvider();
  }
  return instance;
}
