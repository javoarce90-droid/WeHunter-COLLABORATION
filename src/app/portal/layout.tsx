import { type ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCandidateProfile, getCurrentUser } from "@/lib/auth/session";

/**
 * Shell del portal (candidato). Defensa en profundidad: el proxy ya exige sesión para
 * /portal, acá además resolvemos el gate de onboarding.
 *  - sin sesión → /c/login (el proxy ya lo cubre; esto es defensa en profundidad).
 *  - sesión sin onboarding completo → /c/onboarding.
 */
export default async function PortalLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/c/login");
  }

  const candidate = await getCandidateProfile();
  if (!candidate?.candidateOnboardingCompletedAt) {
    redirect("/c/onboarding");
  }

  return <>{children}</>;
}
