"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser, getActiveMembership } from "@/lib/auth/session";
import { desconectarIntegracion } from "./domain/desconectar-integracion";
import { deleteConnection } from "./data/connections.mutations";

export async function desconectarGoogleCalendarAction(): Promise<{ ok: boolean; error?: string }> {
  const [user, membership] = await Promise.all([getCurrentUser(), getActiveMembership()]);

  const result = await desconectarIntegracion(
    { userId: user?.id ?? null, organizationId: membership?.organizationId ?? null },
    { deleteConnection },
  );

  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath("/settings");
  return { ok: true };
}
