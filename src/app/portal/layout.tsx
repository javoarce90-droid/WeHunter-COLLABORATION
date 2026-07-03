import { type ReactNode } from "react";
import { redirect } from "next/navigation";
import { getAccountType, getCandidateProfile, getCurrentUser } from "@/lib/auth/session";

/**
 * Shell del portal (candidato). Defensa en profundidad: el proxy ya exige sesión para
 * /portal, acá además resolvemos el gate de cuenta y de onboarding.
 *  - sin sesión → /c/login (el proxy ya lo cubre; esto es defensa en profundidad).
 *  - cuenta de recruiter → /dashboard (nunca debe ver el portal de candidato).
 *  - sesión sin onboarding completo → /c/onboarding.
 */
export default async function PortalLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/c/login");
  }

  const accountType = await getAccountType();
  if (accountType === "recruiter") {
    redirect("/dashboard");
  }

  const candidate = await getCandidateProfile();
  if (!candidate?.candidateOnboardingCompletedAt) {
    redirect("/c/onboarding");
  }

  return <>{children}</>;
}
