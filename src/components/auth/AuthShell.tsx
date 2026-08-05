import type { ReactNode } from "react";
import Link from "next/link";
import { WehunterLogo } from "@/components/ui/wehunter-logo";

/**
 * Tarjeta centrada sobre el fondo de marca, común a todas las pantallas de autenticación.
 * Lo único que cambia entre reinos es el subtítulo, por eso viene como prop.
 */
export function AuthShell({ tagline, children }: { tagline: string; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-sidebar px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-block">
            <WehunterLogo variant="white" height={36} priority />
          </Link>
          <p className="mt-2 text-sm text-white/60">{tagline}</p>
        </div>
        {children}
      </div>
    </div>
  );
}
