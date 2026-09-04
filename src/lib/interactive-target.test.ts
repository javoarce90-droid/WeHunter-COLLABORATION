import { describe, it, expect } from "vitest";
import { isFromInteractiveDescendant } from "./interactive-target";

/** Simula el subconjunto de `Element` que usa la función, sin necesitar DOM real (entorno de
 *  test en "node", no jsdom) — `closest` es lo único que consulta. */
function fakeTarget(closestReturns: object | null): HTMLElement {
  return { closest: () => closestReturns } as unknown as HTMLElement;
}

describe("isFromInteractiveDescendant", () => {
  it("el evento nace en el propio contenedor (currentTarget) → no es un descendiente", () => {
    const container = fakeTarget(null);
    expect(
      isFromInteractiveDescendant({
        target: container,
        currentTarget: container,
      } as never),
    ).toBe(false);
  });

  it("no hay ningún control interactivo entre el target y el contenedor → false", () => {
    const container = fakeTarget(null);
    // `closest` del target sube hasta el propio contenedor (que también matchea el selector,
    // ej. tiene role="button") sin encontrar nada interactivo antes.
    const target = fakeTarget(container);
    expect(
      isFromInteractiveDescendant({ target, currentTarget: container } as never),
    ).toBe(false);
  });

  it("closest no encuentra nada interactivo en el camino → false", () => {
    const container = fakeTarget(null);
    const target = fakeTarget(null);
    expect(
      isFromInteractiveDescendant({ target, currentTarget: container } as never),
    ).toBe(false);
  });

  it("hay un control (botón, link, diálogo) entre el target y el contenedor → true", () => {
    const container = fakeTarget(null);
    const button = fakeTarget(null);
    const target = fakeTarget(button);
    expect(
      isFromInteractiveDescendant({ target, currentTarget: container } as never),
    ).toBe(true);
  });

  it("sin target (evento sintético degenerado) → false, no explota", () => {
    const container = fakeTarget(null);
    expect(
      isFromInteractiveDescendant({ target: null, currentTarget: container } as never),
    ).toBe(false);
  });
});
