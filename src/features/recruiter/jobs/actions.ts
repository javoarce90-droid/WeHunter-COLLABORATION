"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getActiveMembership, getCurrentUser } from "@/lib/auth/session";
import { jobInputSchema, jobStatusSchema } from "./schema";
import { crearBusqueda } from "./domain/crear-busqueda";
import { editarBusqueda } from "./domain/editar-busqueda";
import { cambiarEstadoBusqueda } from "./domain/cambiar-estado-busqueda";
import { insertJob, updateJobFields, updateJobStatus } from "./data/jobs.mutations";
import { getJobStatus } from "./data/jobs.queries";

export interface JobFormState {
  error?: string;
}

export async function crearBusquedaAction(
  _prev: JobFormState,
  formData: FormData,
): Promise<JobFormState> {
  const parsed = jobInputSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const [user, membership] = await Promise.all([
    getCurrentUser(),
    getActiveMembership(),
  ]);

  const result = await crearBusqueda(
    parsed.data,
    {
      userId: user?.id ?? null,
      organizationId: membership?.organizationId ?? null,
      role: membership?.role ?? null,
    },
    { insertJob },
  );
  if (!result.ok) {
    return { error: result.error };
  }

  redirect("/jobs");
}

export async function editarBusquedaAction(
  _prev: JobFormState,
  formData: FormData,
): Promise<JobFormState> {
  const jobId = String(formData.get("jobId") ?? "");
  const parsed = jobInputSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
  });
  if (!jobId) return { error: "Falta la búsqueda a editar." };
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const membership = await getActiveMembership();
  const result = await editarBusqueda(
    { jobId, ...parsed.data },
    {
      organizationId: membership?.organizationId ?? null,
      role: membership?.role ?? null,
    },
    { updateJobFields },
  );
  if (!result.ok) {
    return { error: result.error };
  }

  redirect("/jobs");
}

/** Botones de estado (publicar/pausar/cerrar). Revalida la lista al terminar. */
export async function cambiarEstadoBusquedaAction(
  formData: FormData,
): Promise<void> {
  const jobId = String(formData.get("jobId") ?? "");
  const estado = jobStatusSchema.safeParse(formData.get("nuevoEstado"));
  if (!jobId || !estado.success) return;

  const membership = await getActiveMembership();
  await cambiarEstadoBusqueda(
    { jobId, nuevoEstado: estado.data },
    {
      organizationId: membership?.organizationId ?? null,
      role: membership?.role ?? null,
    },
    { getJobStatus, updateJobStatus },
  );

  revalidatePath("/jobs");
}
