import { redirect } from "next/navigation";
import { getCandidateProfile } from "@/lib/auth/session";
import { CandidateProfileForm } from "@/features/candidate/profile/ui/CandidateProfileForm";
import { completarOnboardingAction } from "@/features/candidate/onboarding/actions";

export default async function OnboardingManualPage() {
  const candidate = await getCandidateProfile();
  if (!candidate) redirect("/c/login");
  if (candidate.candidateOnboardingCompletedAt) redirect("/portal");

  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg px-4 py-12">
      <CandidateProfileForm
        initialFullName={candidate.fullName ?? ""}
        initialEmail={candidate.email}
        initialHeadline={candidate.headline}
        initialLocation={candidate.location}
        initialLinkedinUrl={candidate.linkedinUrl}
        initialSummary={candidate.bio}
        initialSkills={candidate.skills}
        initialCvUrl={candidate.cvUrl}
        initialCvDownloadUrl={null}
        action={completarOnboardingAction}
        submitLabel="Finalizar registro"
      />
    </div>
  );
}
