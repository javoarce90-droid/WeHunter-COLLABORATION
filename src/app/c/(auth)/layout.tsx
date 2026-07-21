import type { ReactNode } from "react";
import { AuthShell } from "@/components/auth/AuthShell";

/** Layout de las pantallas de cuenta del candidato: misma tarjeta que (auth). */
export default function CandidateAuthLayout({ children }: { children: ReactNode }) {
  return <AuthShell tagline="Postulate a tu próxima oportunidad">{children}</AuthShell>;
}
