"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getActiveMembership, getCurrentUser } from "@/lib/auth/session";
import { jobInputSchema, jobStatusSchema, jobAreaSchema } from "./schema";
import type { Benefit, JobArea } from "./domain/job-details";
import { crearBusqueda } from "./domain/crear-busqueda";
import { editarBusqueda } from "./domain/editar-busqueda";
import { cambiarEstadoBusqueda } from "./domain/cambiar-estado-busqueda";
import { insertJob, updateJobFields, updateJobStatus } from "./data/jobs.mutations";
import { getJobStatus } from "./data/jobs.queries";
import { getAiProvider } from "@/lib/ai";

export interface JobFormState {
  error?: string;
}

export type BorradorBusqueda = {
  position: string;
  jobArea: JobArea | null;
  objectives: string;
  requirements: string;
  responsibilities: string;
  benefits: Benefit[];
  vacancies: number;
  skills: string[];
};

/**
 * Crear con IA: a partir de los inputs mínimos (nombre + brief + modalidad + seniority + jornada),
 * la IA devuelve un borrador estructurado de la búsqueda para prellenar el form y que el recruiter
 * lo revise/edite antes de guardar. El `jobArea` se valida contra el catálogo (si no mapea, null).
 */
export async function generarBorradorAction(input: {
  name: string;
  brief: string;
  modality: string | null;
  seniority: string | null;
  workDay: string | null;
}): Promise<{ ok: boolean; draft?: BorradorBusqueda; error?: string }> {
  const membership = await getActiveMembership();
  if (!membership) return { ok: false, error: "No autorizado." };
  if (!input.name.trim()) return { ok: false, error: "Cargá el nombre primero." };

  const draft = await getAiProvider().draftJobOffer(input);
  const area = jobAreaSchema.safeParse(draft.jobArea);

  return {
    ok: true,
    draft: {
      position: draft.position,
      jobArea: area.success ? area.data : null,
      objectives: draft.objectives,
      requirements: draft.requirements,
      responsibilities: draft.responsibilities,
      benefits: draft.benefits,
      vacancies: draft.vacancies,
      skills: draft.skills,
    },
  };
}

/** Lee del FormData todos los campos de la búsqueda (núcleo + ricos) para validar con Zod. */
function parseJobForm(formData: FormData) {
  return jobInputSchema.safeParse({
    title: formData.get("title"),
    position: formData.get("position"),
    jobArea: formData.get("jobArea"),
    description: formData.get("description"),
    posting: formData.get("posting"),
    clientId: formData.get("clientId"),
    location: formData.get("location"),
    modality: formData.get("modality"),
    seniority: formData.get("seniority"),
    employmentType: formData.get("employmentType"),
    salaryMin: formData.get("salaryMin"),
    salaryMax: formData.get("salaryMax"),
    salaryCurrency: formData.get("salaryCurrency"),
    skills: formData.get("skills"),
    priority: formData.get("priority"),
    deadline: formData.get("deadline"),
    vacancies: formData.get("vacancies"),
    objectives: formData.get("objectives"),
    requirements: formData.get("requirements"),
    responsibilities: formData.get("responsibilities"),
    benefits: formData.get("benefits"),
  });
}

export async function crearBusquedaAction(
  _prev: JobFormState,
  formData: FormData,
): Promise<JobFormState> {
  const parsed = parseJobForm(formData);
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

  // Caés directo en el pipeline de la búsqueda recién creada: ahí mismo sumás candidatos
  // (del pool o nuevos) sin pasos intermedios. Conecta crear-búsqueda → cargar-candidatos.
  redirect(`/jobs/${result.data.jobId}/pipeline`);
}

export async function editarBusquedaAction(
  _prev: JobFormState,
  formData: FormData,
): Promise<JobFormState> {
  const jobId = String(formData.get("jobId") ?? "");
  const parsed = parseJobForm(formData);
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
