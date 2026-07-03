import { redirect } from "next/navigation";
import { getCandidateProfile } from "@/lib/auth/session";
import { AiOnboardingFlow } from "@/features/candidate/onboarding/ui/AiOnboardingFlow";

export default async function OnboardingIaPage() {
  const candidate = await getCandidateProfile();
  if (!candidate) redirect("/c/login");
  if (candidate.candidateOnboardingCompletedAt) redirect("/portal");

  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg px-4 py-12">
      <AiOnboardingFlow fullName={candidate.fullName ?? ""} email={candidate.email} />
    </div>
  );
}
