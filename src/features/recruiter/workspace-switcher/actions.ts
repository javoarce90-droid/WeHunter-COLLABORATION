"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { ACTIVE_ORG_COOKIE, getCurrentUser, getMyMemberships } from "@/lib/auth/session";
import { cambiarWorkspaceActivo } from "./domain/cambiar-workspace-activo";
import { crearOrganization } from "@/features/recruiter/onboarding/domain/crear-organization";
import { createOrganizationWithOwner } from "@/features/recruiter/onboarding/data/onboarding.mutations";
import { crearOrganizationSchema } from "@/features/recruiter/onboarding/schema";
import { buildDefaultStageTemplate } from "@/features/recruiter/pipeline-stages/domain/gestionar-plantilla-etapas";
import { replaceStageTemplate } from "@/features/recruiter/pipeline-stages/data/job-stage-templates.mutations";

// 1 año, mismo patrón que `wh.sidebar.collapsed` (Sidebar.tsx).
const ACTIVE_ORG_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** Cambia cuál workspace del usuario está viendo. Redirige siempre a /dashboard: si el id
 *  no era suyo, el dominio lo rechaza y la cookie no se toca (getActiveMembership sigue
 *  cayendo al fallback de siempre), sin exponerle un error al que no le corresponde. */
export async function cambiarWorkspaceActivoAction(organizationId: string): Promise<void> {
  const parsed = z.string().uuid().safeParse(organizationId);
  if (parsed.success) {
    const memberships = await getMyMemberships();
    const result = cambiarWorkspaceActivo({ organizationId: parsed.data }, { memberships });
    if (result.ok) {
      (await cookies()).set(ACTIVE_ORG_COOKIE, result.data.organizationId, {
        path: "/",
        maxAge: ACTIVE_ORG_COOKIE_MAX_AGE,
        sameSite: "lax",
      });
    }
  }
  redirect("/dashboard");
}

export interface CrearWorkspaceAdicionalState {
  error?: string;
}

/** Crear un workspace propio adicional desde el selector — mismo caso de uso que el
 *  onboarding (`crearOrganization`), solo cambia el punto de entrada: acá el usuario ya
 *  tiene cuenta y al menos un workspace. Deja al usuario viendo el que acaba de crear. */
export async function crearWorkspaceAdicionalAction(
  _prev: CrearWorkspaceAdicionalState,
  formData: FormData,
): Promise<CrearWorkspaceAdicionalState> {
  const parsed = crearOrganizationSchema.safeParse({
    name: formData.get("name"),
    workspaceType: formData.get("workspaceType"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const user = await getCurrentUser();
  const result = await crearOrganization(
    parsed.data,
    { userId: user?.id ?? null },
    { createOrganizationWithOwner },
  );
  if (!result.ok) {
    return { error: result.error };
  }

  await replaceStageTemplate(result.data.organizationId, buildDefaultStageTemplate());

  (await cookies()).set(ACTIVE_ORG_COOKIE, result.data.organizationId, {
    path: "/",
    maxAge: ACTIVE_ORG_COOKIE_MAX_AGE,
    sameSite: "lax",
  });
  redirect("/dashboard");
}
