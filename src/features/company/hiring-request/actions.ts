"use server";

import { revalidatePath } from "next/cache";
import { getAiProvider } from "@/lib/ai";
import { jobAreaSchema } from "@/features/recruiter/jobs/schema";
import { solicitarBusquedaSchema, sugerirSolicitudSchema } from "./schema";
import { solicitarBusqueda } from "./domain/solicitar-busqueda";
import { sugerirSolicitud } from "./domain/sugerir-solicitud";
import type { BorradorSolicitud } from "./domain/sugerir-solicitud";
import { clientTokenEsValido, createRequisitionRpc } from "./data/hiring-request.data";

export interface SolicitarBusquedaActionState {
  error?: string;
  ok?: boolean;
}

export async function sugerirSolicitudAction(input: {
  token: string;
  title: string;
  brief: string;
  modality: string | null;
  seniority: string | null;
  employmentType: string | null;
}): Promise<{ ok: boolean; draft?: BorradorSolicitud; error?: string }> {
  const parsed = sugerirSolicitudSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const result = await sugerirSolicitud(parsed.data, {
    tokenEsValido: clientTokenEsValido,
    generarBorrador: (args) => getAiProvider().draftJobOffer(args),
    esAreaValida: (area) => jobAreaSchema.safeParse(area).success,
  });

  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, draft: result.data };
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
