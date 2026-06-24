import type { InterviewMode, InterviewStatus } from "../schema";
import type { InterviewRow } from "./agendar-entrevista";

// ---- Tipos del caso de uso ----

export type ActualizarEntrevistaInput = {
  interviewId: string;
  scheduledAt: Date;
  mode: InterviewMode;
  status: InterviewStatus;
  location?: string;
  notes?: string;
};

export type ActualizarEntrevistaContext = {
  userId: string;
  organizationId: string;
  role: "owner" | "admin" | "recruiter" | "consultant";
};

export type ActualizarEntrevistaDeps = {
  getInterviewById: (
    interviewId: string,
    organizationId: string,
  ) => Promise<InterviewRow | null>;
  updateInterview: (
    interviewId: string,
    data: {
      scheduledAt: Date;
      mode: InterviewMode;
      status: InterviewStatus;
      location: string | null;
      notes: string | null;
    },
  ) => Promise<InterviewRow>;
};

// ---- Caso de uso ----
// Sirve para reprogramar (cambiar fecha/modalidad/lugar) y para marcar el resultado
// (realizada/cancelada). No restringe fechas pasadas: una entrevista realizada ocurre antes.

export async function actualizarEntrevista(
  input: ActualizarEntrevistaInput,
  ctx: ActualizarEntrevistaContext,
  deps: ActualizarEntrevistaDeps,
): Promise<{ ok: true; data: InterviewRow } | { ok: false; error: string }> {
  if (ctx.role === "consultant") {
    return { ok: false, error: "Los consultores no pueden editar entrevistas." };
  }

  const interview = await deps.getInterviewById(input.interviewId, ctx.organizationId);
  if (!interview) {
    return { ok: false, error: "Entrevista no encontrada." };
  }

  if (Number.isNaN(input.scheduledAt.getTime())) {
    return { ok: false, error: "Fecha y hora inválidas." };
  }

  const updated = await deps.updateInterview(input.interviewId, {
    scheduledAt: input.scheduledAt,
    mode: input.mode,
    status: input.status,
    location: normalize(input.location),
    notes: normalize(input.notes),
  });

  return { ok: true, data: updated };
}

function normalize(value: string | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}
