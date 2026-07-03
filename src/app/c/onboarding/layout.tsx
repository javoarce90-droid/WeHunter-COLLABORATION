import { type ReactNode } from "react";
import { redirect } from "next/navigation";
import { getAccountType, getCurrentUser } from "@/lib/auth/session";

/**
 * Shell del onboarding de candidato. Defensa en profundidad (el proxy ya exige sesión para
 * /c/onboarding):
 *  - sin sesión → /c/login.
 *  - cuenta de recruiter → /dashboard (nunca debe ver este form).
 */
export default async function CandidateOnboardingLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/c/login");
  }

  const accountType = await getAccountType();
  if (accountType === "recruiter") {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
