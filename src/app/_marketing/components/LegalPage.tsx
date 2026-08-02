import type { ReactNode } from "react";
import Link from "next/link";
import "../landing.css";

/**
 * Shell de las páginas legales públicas (`/legal/terminos`, `/legal/privacidad`) — a
 * diferencia del modal de `LegalSection.tsx`, estas son URLs reales y rastreables: Google las
 * exige para verificar el consent screen de OAuth (no acepta un link que solo abre un modal JS).
 */
export function LegalPage({ children }: { children: ReactNode }) {
  return (
    <div className="wh-landing" style={{ minHeight: "100vh", padding: "48px 16px" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <Link href="/" style={{ fontSize: 13, color: "var(--muted)" }}>
          ← Volver a WeHunter
        </Link>
        <div style={{ marginTop: 24 }}>{children}</div>
      </div>
    </div>
  );
}
