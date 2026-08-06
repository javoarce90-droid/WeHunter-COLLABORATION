import Link from "next/link";
import { WehunterLogo } from "@/components/ui/wehunter-logo";

/** Header propio de la Comunidad: marca de WeHunter, no de una organización puntual (a
 *  diferencia de CareerSiteHeader, que sí lleva branding por org). */
export function CommunityHeader() {
  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <Link href="/" aria-label="Ir al inicio de WeHunter">
          <WehunterLogo height={28} priority />
        </Link>
        <Link
          href="/"
          className="text-sm font-semibold text-muted transition-colors hover:text-primary"
        >
          Volver al inicio
        </Link>
      </div>
    </header>
  );
}
