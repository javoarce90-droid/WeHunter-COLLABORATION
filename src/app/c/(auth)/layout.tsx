import type { ReactNode } from "react";
import Link from "next/link";
import { WehunterLogo } from "@/components/ui/wehunter-logo";

/** Layout de las pantallas de cuenta del candidato: misma tarjeta centrada que (auth). */
export default function CandidateAuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-sidebar px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-block">
            <WehunterLogo variant="white" height={36} />
          </Link>
          <p className="mt-2 text-sm text-white/60">Postulate a tu próxima oportunidad</p>
        </div>
        {children}
      </div>
    </div>
  );
}
