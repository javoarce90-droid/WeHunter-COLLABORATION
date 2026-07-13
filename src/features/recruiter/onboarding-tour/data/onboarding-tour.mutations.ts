import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { memberships } from "@/db/schema";

export async function dismissOnboardingTour(
  profileId: string,
  organizationId: string,
): Promise<void> {
  const db = await getDb();
  await db.rls(
    (tx) =>
      tx
        .update(memberships)
        .set({ onboardingDismissedAt: new Date(), updatedAt: new Date() })
        .where(
          and(
            eq(memberships.profileId, profileId),
            eq(memberships.organizationId, organizationId),
          ),
        ),
    "db.onboarding-tour.dismiss",
  );
}
