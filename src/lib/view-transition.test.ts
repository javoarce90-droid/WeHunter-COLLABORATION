import { describe, it, expect, vi, afterEach } from "vitest";
import { startViewTransition } from "./view-transition";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("startViewTransition", () => {
  it("sin `document` (SSR) aplica el cambio directo, exactamente una vez", () => {
    const mutate = vi.fn();
    startViewTransition(mutate);
    expect(mutate).toHaveBeenCalledTimes(1);
  });

  it("sin soporte de la API en el navegador, cae al cambio directo sin explotar", () => {
    vi.stubGlobal("document", {});
    vi.stubGlobal("window", { matchMedia: () => ({ matches: false }) });
    const mutate = vi.fn();
    expect(() => startViewTransition(mutate)).not.toThrow();
    expect(mutate).toHaveBeenCalledTimes(1);
  });

  it("con `prefers-reduced-motion` no abre una transición, aplica directo", () => {
    const startVT = vi.fn();
    vi.stubGlobal("document", { startViewTransition: startVT });
    vi.stubGlobal("window", {
      matchMedia: (q: string) => ({ matches: q.includes("reduce") }),
    });
    const mutate = vi.fn();
    startViewTransition(mutate);
    expect(startVT).not.toHaveBeenCalled();
    expect(mutate).toHaveBeenCalledTimes(1);
  });

  it("con soporte y sin reduced-motion, delega en `document.startViewTransition`", () => {
    const startVT = vi.fn();
    vi.stubGlobal("document", { startViewTransition: startVT });
    vi.stubGlobal("window", { matchMedia: () => ({ matches: false }) });
    const mutate = vi.fn();
    startViewTransition(mutate);
    expect(startVT).toHaveBeenCalledTimes(1);
    expect(startVT).toHaveBeenCalledWith(mutate);
  });
});
