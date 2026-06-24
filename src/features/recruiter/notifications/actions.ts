"use server";

import { revalidatePath } from "next/cache";
import { getActiveMembership } from "@/lib/auth/session";
import { markAllRead } from "./data/notifications.mutations";

export async function marcarLeidasAction(): Promise<{ ok: boolean }> {
  const membership = await getActiveMembership();
  if (!membership) return { ok: false };
  await markAllRead(membership.organizationId);
  revalidatePath("/", "layout");
  return { ok: true };
}
