import { redirect } from "next/navigation";
import { getAccountType, getActiveMembership } from "@/lib/auth/session";
import type { WorkspaceType } from "@/lib/auth/session";
import { getActivePlans } from "@/features/recruiter/billing/data/plans.queries";
import { formatPrice } from "@/features/recruiter/billing/plan";
import { CreateOrganizationForm } from "@/features/recruiter/onboarding/ui/CreateOrganizationForm";

/**
 * Si el usuario ya tiene un workspace, no hay nada que onboardear. Un candidato nunca debe
 * ver este form (crear organization es cosa de recruiter) — chequeo explícito por
 * account_type, no inferido de si tiene o no membership.
 */
export default async function OnboardingPage() {
  const accountType = await getAccountType();
  if (accountType === "candidate") {
    redirect("/portal");
  }

  const membership = await getActiveMembership();
  if (membership) {
    redirect("/dashboard");
  }

  const plans = await getActivePlans();
  const prices: Partial<Record<WorkspaceType, string>> = {};
  for (const p of plans) {
    prices[p.workspaceType] = formatPrice(p.price, p.currency);
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg px-4 py-12">
      <div className="w-full max-w-md">
        <CreateOrganizationForm prices={prices} />
      </div>
    </div>
  );
}
