import { describe, it, expect } from "vitest";
import { validarDimensionesPortada, COVER_MIN_WIDTH, COVER_MIN_HEIGHT } from "./validar-portada";

describe("validarDimensionesPortada", () => {
  it("acepta una imagen que cumple el mínimo", () => {
    const r = validarDimensionesPortada(COVER_MIN_WIDTH, COVER_MIN_HEIGHT);
    expect(r.ok).toBe(true);
  });

  it("rechaza una imagen más angosta que el mínimo", () => {
    const r = validarDimensionesPortada(COVER_MIN_WIDTH - 1, COVER_MIN_HEIGHT);
    expect(r).toEqual({
      ok: false,
      error: `La portada necesita al menos ${COVER_MIN_WIDTH}×${COVER_MIN_HEIGHT}px (esta imagen es de ${COVER_MIN_WIDTH - 1}×${COVER_MIN_HEIGHT}px).`,
    });
  });

  it("rechaza una imagen más baja que el mínimo", () => {
    const r = validarDimensionesPortada(COVER_MIN_WIDTH, COVER_MIN_HEIGHT - 1);
    expect(r.ok).toBe(false);
  });
});
