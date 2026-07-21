"use client";

import { useEffect, useRef } from "react";
import { registrarVisitaAvisoAction } from "../actions";

/**
 * Cuenta una visita al aviso, una sola vez por sesión de navegador. Vive en el cliente
 * a propósito: es la única forma de deduplicar (un Server Component no puede escribir la
 * marca de "ya lo conté"), y de paso deja afuera los prefetch y los bots sin JS.
 *
 * No renderiza nada ni bloquea la página.
 */
export function TrackJobView({ slug, jobId }: { slug: string; jobId: string }) {
  const yaContado = useRef(false);

  useEffect(() => {
    if (yaContado.current) return;
    yaContado.current = true;

    const key = `wh:job-view:${jobId}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // Storage bloqueado (modo privado estricto): se cuenta igual, sin dedupe.
    }
    void registrarVisitaAvisoAction(slug, jobId);
  }, [slug, jobId]);

  return null;
}
