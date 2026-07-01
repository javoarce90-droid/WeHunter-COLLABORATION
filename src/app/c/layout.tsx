import type { ReactNode } from "react";

/** Layout de las pantallas de cuenta del candidato: misma tarjeta centrada que (auth). */
export default function CandidateAuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-sidebar px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="font-display text-2xl font-bold text-white">
            <span className="text-ai">We</span>Hunter
          </span>
          <p className="mt-1 text-sm text-white/60">Postulate a tu próxima oportunidad</p>
        </div>
        {children}
      </div>
    </div>
  );
}
