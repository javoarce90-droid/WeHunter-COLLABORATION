"use client";

import { useEffect, useState } from "react";

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Cuenta de 0 al valor final en ~500ms al montarse. Se usa para el score de compatibilidad
 * de la bandeja: cuando el análisis de IA termina y el número aparece, verlo subir refuerza
 * que se acaba de calcular. Con `prefers-reduced-motion` muestra el valor final directo.
 */
export function ScoreCountUp({ target }: { target: number }) {
  const [value, setValue] = useState(() =>
    prefersReducedMotion() ? target : 0,
  );

  useEffect(() => {
    const duration = prefersReducedMotion() ? 0 : 500;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = duration === 0 ? 1 : Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);

  return <>{value}</>;
}
