/**
 * Cache en memoria del proceso, por clave, con TTL. Complementa a `cache()` de React: ese
 * solo dedupea DENTRO de un mismo request (una carga de layout + tab); al cambiar de pestaña
 * con <Link> cada tab sigue siendo un request nuevo al server con su propio `cache()` — sin
 * esto, una query pedida por varias tabs (ej. `getJobById`, `listMembers`) se repite en cada
 * click. Los callers son responsables de invalidar explícitamente en cada mutación relevante
 * (`cache.invalidate(key)`); el TTL es solo la red de seguridad para lo que no se invalida a
 * mano y para instancias serverless distintas, que no comparten este Map.
 */
export function createKeyedCache<T>(ttlMs: number) {
  const store = new Map<string, { value: T; expiresAt: number }>();

  return {
    get(key: string): T | undefined {
      const hit = store.get(key);
      if (!hit) return undefined;
      if (hit.expiresAt <= Date.now()) {
        store.delete(key);
        return undefined;
      }
      return hit.value;
    },
    set(key: string, value: T): void {
      store.set(key, { value, expiresAt: Date.now() + ttlMs });
    },
    invalidate(key: string): void {
      store.delete(key);
    },
  };
}
