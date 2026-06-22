/**
 * Resultado explícito de un caso de uso. Los casos de uso del dominio NO tiran
 * excepciones para el control de flujo normal: devuelven ok/err. Ver
 * .claude/rules/conventions.md (sección Errores).
 */
export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export const ok = <T>(data: T): Result<T> => ({ ok: true, data });
export const err = (error: string): Result<never> => ({ ok: false, error });
