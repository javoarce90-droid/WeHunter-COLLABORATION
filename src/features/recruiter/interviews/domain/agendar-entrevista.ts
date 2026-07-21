import type { InterviewMode, InterviewStatus, InterviewType } from "../schema";
import type { OrgRole } from "@/lib/auth/session";
import { can } from "@/lib/auth/roles";

/** Fila de entrevista tal como la devuelve la capa de datos. Tipo compartido del dominio. */
export type InterviewRow = {
  id: string;
  organizationId: string;
  applicationId: string;
  scheduledAt: Date;
  mode: InterviewMode;
  type: InterviewType;
  location: string | null;
  notes: string | null;
  status: InterviewStatus;
  participantEmails: string[];
  // null = no sincronizada con Google Calendar (sin conexión del creador, o nunca se intentó).
  googleEventId: string | null;
  // Motivo del último intento de sync fallido. null si está sincronizada o nunca se intentó.
  googleSyncError: string | null;
};

// ---- Tipos del caso de uso ----

export type AgendarEntrevistaInput = {
  applicationId: string;
  scheduledAt: Date;
  mode: InterviewMode;
  type: InterviewType;
  location?: string;
  notes?: string;
  participantEmails?: string[];
};

export type AgendarEntrevistaContext = {
  userId: string;
  organizationId: string;
  role: OrgRole;
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
    type: InterviewType;
    location: string | null;
    notes: string | null;
    participantEmails: string[];
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
  if (!can(ctx.role, "interviews.manage")) {
    return { ok: false, error: "Tu rol no permite agendar entrevistas." };
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
    type: input.type,
    location: normalize(input.location),
    notes: normalize(input.notes),
    participantEmails: input.participantEmails ?? [],
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
