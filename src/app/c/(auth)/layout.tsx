import type { ReactNode } from "react";

/** Layout de autenticación para candidatos */
export default function CandidateAuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-sidebar px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="font-display text-2xl font-bold text-white">
            <span className="text-ai">We</span>Hunter <span className="text-xs bg-primary px-2 py-0.5 rounded text-white/90 font-sans ml-1">Talento</span>
          </span>
          <p className="mt-2 text-xs text-white/50">Buscá empleo, postulate y seguí tus postulaciones</p>
        </div>
        {children}
      </div>
    </div>
  );
}
