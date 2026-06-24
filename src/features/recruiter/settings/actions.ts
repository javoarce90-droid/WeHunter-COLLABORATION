"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db/client";
import { profiles } from "@/db/schema";
import { getActiveMembership } from "@/lib/auth/session";

export async function actualizarPerfilAction(
  _prev: { error?: string; ok?: boolean },
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  const parsed = z
    .object({ fullName: z.string().trim().min(1, "El nombre es obligatorio.").max(120) })
    .safeParse({ fullName: formData.get("fullName") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const membership = await getActiveMembership();
  if (!membership) return { error: "No autorizado." };

  const db = await getDb();
  if (!db.userId) return { error: "No autorizado." };
  await db.rls(
    (tx) =>
      tx
        .update(profiles)
        .set({ fullName: parsed.data.fullName, updatedAt: new Date() })
        .where(eq(profiles.id, db.userId!)),
    "db.settings.update-profile",
  );

  revalidatePath("/settings");
  return { ok: true };
}
