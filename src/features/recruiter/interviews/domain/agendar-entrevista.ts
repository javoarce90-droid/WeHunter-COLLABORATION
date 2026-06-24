import type { InterviewMode, InterviewStatus } from "../schema";

/** Fila de entrevista tal como la devuelve la capa de datos. Tipo compartido del dominio. */
export type InterviewRow = {
  id: string;
  organizationId: string;
  applicationId: string;
  scheduledAt: Date;
  mode: InterviewMode;
  location: string | null;
  notes: string | null;
  status: InterviewStatus;
};

// ---- Tipos del caso de uso ----

export type AgendarEntrevistaInput = {
  applicationId: string;
  scheduledAt: Date;
  mode: InterviewMode;
  location?: string;
  notes?: string;
};

export type AgendarEntrevistaContext = {
  userId: string;
  organizationId: string;
  role: "owner" | "admin" | "recruiter" | "consultant";
};

export type AgendarEntrevistaDeps = {
  getApplicationById: (
    applicationId: string,
    organizationId: string,
  ) => Promise<{ id: string } | null>;
  createInterview: (data: {
    organizationId: string;
    applicationId: string;
    scheduledAt: Date;
    mode: InterviewMode;
    location: string | null;
    notes: string | null;
    createdBy: string | null;
  }) => Promise<InterviewRow>;
};

// ---- Caso de uso ----

export async function agendarEntrevista(
  input: AgendarEntrevistaInput,
  ctx: AgendarEntrevistaContext,
  deps: AgendarEntrevistaDeps,
): Promise<{ ok: true; data: InterviewRow } | { ok: false; error: string }> {
  // Coordinar entrevistas es tarea del equipo reclutador, no de los consultores (solo lectura).
  if (ctx.role === "consultant") {
    return { ok: false, error: "Los consultores no pueden agendar entrevistas." };
  }

  const application = await deps.getApplicationById(input.applicationId, ctx.organizationId);
  if (!application) {
    return { ok: false, error: "Postulación no encontrada." };
  }

  if (Number.isNaN(input.scheduledAt.getTime())) {
    return { ok: false, error: "Fecha y hora inválidas." };
  }

  // Al agendar (estado inicial = scheduled) la entrevista es futura. Para registrar una
  // entrevista pasada se usa "actualizar" y se marca como realizada.
  if (input.scheduledAt.getTime() <= Date.now()) {
    return { ok: false, error: "La fecha de la entrevista debe ser futura." };
  }

  const created = await deps.createInterview({
    organizationId: ctx.organizationId,
    applicationId: input.applicationId,
    scheduledAt: input.scheduledAt,
    mode: input.mode,
    location: normalize(input.location),
    notes: normalize(input.notes),
    createdBy: ctx.userId || null,
  });

  return { ok: true, data: created };
}

/** Texto vacío/espacios → null (no guardamos cadenas vacías). */
function normalize(value: string | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}
