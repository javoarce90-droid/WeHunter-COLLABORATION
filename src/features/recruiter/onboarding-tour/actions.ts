"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser, getActiveMembership } from "@/lib/auth/session";
import { descartarTour } from "./domain/descartar-tour";
import { dismissOnboardingTour } from "./data/onboarding-tour.mutations";

export async function descartarTourAction(): Promise<{ ok: boolean }> {
  const [user, membership] = await Promise.all([getCurrentUser(), getActiveMembership()]);

  const result = await descartarTour(
    { userId: user?.id ?? null, organizationId: membership?.organizationId ?? null },
    { dismissOnboardingTour },
  );

  if (!result.ok) return { ok: false };

  revalidatePath("/", "layout");
  return { ok: true };
}
