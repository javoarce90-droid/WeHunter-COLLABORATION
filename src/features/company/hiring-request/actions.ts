"use server";

import { revalidatePath } from "next/cache";
import { solicitarBusquedaSchema } from "./schema";
import { solicitarBusqueda } from "./domain/solicitar-busqueda";
import { createRequisitionRpc } from "./data/hiring-request.data";

export interface SolicitarBusquedaActionState {
  error?: string;
  ok?: boolean;
}

export async function solicitarBusquedaAction(
  _prev: SolicitarBusquedaActionState,
  formData: FormData,
): Promise<SolicitarBusquedaActionState> {
  const parsed = solicitarBusquedaSchema.safeParse({
    token: formData.get("token"),
    reason: formData.get("reason"),
    title: formData.get("title"),
    position: formData.get("position"),
    jobArea: formData.get("jobArea"),
    location: formData.get("location"),
    modality: formData.get("modality"),
    seniority: formData.get("seniority"),
    employmentType: formData.get("employmentType"),
    skills: formData.get("skills"),
    budget: formData.get("budget"),
    estimatedStartDate: formData.get("estimatedStartDate"),
    objectives: formData.get("objectives"),
    requirements: formData.get("requirements"),
    responsibilities: formData.get("responsibilities"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const result = await solicitarBusqueda(parsed.data, {
    createRequisition: createRequisitionRpc,
  });

  if (!result.ok) return { error: result.error };

  revalidatePath(`/client/${parsed.data.token}`);
  return { ok: true };
}
