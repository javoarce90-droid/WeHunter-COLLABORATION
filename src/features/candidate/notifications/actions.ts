"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { markAllReadForCandidate } from "./data/notifications.mutations";

export async function marcarLeidasCandidatoAction(): Promise<{ ok: boolean }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false };
  await markAllReadForCandidate();
  revalidatePath("/portal", "layout");
  return { ok: true };
}
