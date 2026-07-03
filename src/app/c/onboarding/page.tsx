import { redirect } from "next/navigation";
import { getCandidateProfile } from "@/lib/auth/session";
import { OnboardingChoice } from "@/features/candidate/onboarding/ui/OnboardingChoice";

/** Si ya completó (o saltó) el onboarding, no hay nada que hacer acá. */
export default async function CandidateOnboardingPage() {
  const candidate = await getCandidateProfile();
  if (candidate?.candidateOnboardingCompletedAt) {
    redirect("/portal");
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg px-4 py-12">
      <div className="w-full">
        <div className="mx-auto mb-8 max-w-2xl text-center">
          <h1 className="text-2xl font-bold font-display text-text">Completá tu perfil</h1>
          <p className="mt-1.5 text-sm text-muted">
            Así los reclutadores te conocen mejor cuando te postulás. Podés hacerlo ahora o
            después.
          </p>
        </div>
        <OnboardingChoice />
      </div>
    </div>
  );
}
