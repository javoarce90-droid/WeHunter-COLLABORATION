"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser, getActiveMembership } from "@/lib/auth/session";
import {
  agendarInterviewSchema,
  actualizarInterviewSchema,
  eliminarInterviewSchema,
} from "./schema";
import { agendarEntrevista } from "./domain/agendar-entrevista";
import { actualizarEntrevista } from "./domain/actualizar-entrevista";
import { eliminarEntrevista } from "./domain/eliminar-entrevista";
import { sincronizarEntrevista } from "@/features/recruiter/google-calendar/domain/sincronizar-entrevista";
import type { SincronizarEntrevistaEvent } from "@/features/recruiter/google-calendar/domain/sincronizar-entrevista";
import {
  getApplicationForInterview,
  getInterviewById,
  getInterviewSyncContext,
} from "./data/interviews.queries";
import {
  insertInterview,
  updateInterview,
  deleteInterview,
  updateInterviewGoogleSync,
} from "./data/interviews.mutations";
import { getConnectionByProfile } from "@/features/recruiter/google-calendar/data/connections.queries";
import {
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from "@/features/recruiter/google-calendar/data/calendar-client";

export interface InterviewActionState {
  error?: string;
}

/** Revalida el pipeline del job indicado en el form (las entrevistas se ven ahí). */
function revalidatePipeline(formData: FormData) {
  const jobId = String(formData.get("jobId") ?? "");
  if (jobId) revalidatePath(`/jobs/${jobId}/pipeline`);
}

/** Junta el multiselect de equipo (checkboxes) + el textarea de emails externos, deduplicado. */
function collectParticipantEmails(formData: FormData): string[] {
  const teamEmails = formData.getAll("participantEmails").map(String);
  const externalRaw = String(formData.get("externalEmails") ?? "");
  const externalEmails = externalRaw
    .split(/[,\n]/)
    .map((e) => e.trim())
    .filter(Boolean);
  const all = [...teamEmails, ...externalEmails].map((e) => e.toLowerCase());
  return Array.from(new Set(all));
}

/**
 * Sincroniza con el Google Calendar de quien está logueado (automática si hay conexión, ver
 * backlog §7). No crítico: si falla, la entrevista en la app queda igual — solo se guarda el
 * motivo del error para mostrarlo en la UI.
 */
async function syncGoogleCalendar(args: {
  event: SincronizarEntrevistaEvent;
  interviewId: string;
  applicationId: string;
  existingGoogleEventId: string | null;
  cancelled: boolean;
  scheduledAt: Date;
  location: string | null;
  participantEmails: string[];
  profileId: string;
  organizationId: string;
}): Promise<void> {
  const context =
    args.event === "deleted"
      ? null
      : await getInterviewSyncContext(args.applicationId, args.organizationId);

  const attendeeEmails = context?.candidateEmail
    ? Array.from(new Set([...args.participantEmails, context.candidateEmail.toLowerCase()]))
    : args.participantEmails;

  await sincronizarEntrevista(
    {
      event: args.event,
      interviewId: args.interviewId,
      existingGoogleEventId: args.existingGoogleEventId,
      cancelled: args.cancelled,
      summary: context
        ? `Entrevista — ${context.candidateName} (${context.jobTitle})`
        : "Entrevista",
      description: null,
      startsAt: args.scheduledAt,
      location: args.location,
      attendeeEmails,
    },
    { profileId: args.profileId, organizationId: args.organizationId },
    {
      getConnection: getConnectionByProfile,
      createEvent: createCalendarEvent,
      updateEvent: updateCalendarEvent,
      deleteEvent: deleteCalendarEvent,
      saveSyncResult: updateInterviewGoogleSync,
    },
  );
}

export async function agendarInterviewAction(
  _prev: InterviewActionState,
  formData: FormData,
): Promise<InterviewActionState> {
  const parsed = agendarInterviewSchema.safeParse({
    applicationId: formData.get("applicationId"),
    scheduledAt: formData.get("scheduledAt"),
    mode: formData.get("mode"),
    type: formData.get("type"),
    location: formData.get("location") ?? undefined,
    notes: formData.get("notes") ?? undefined,
    participantEmails: collectParticipantEmails(formData),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const [user, membership] = await Promise.all([getCurrentUser(), getActiveMembership()]);
  if (!user || !membership) return { error: "No autorizado." };

  const result = await agendarEntrevista(
    parsed.data,
    {
      userId: user.id,
      organizationId: membership.organizationId,
      role: membership.role,
    },
    {
      getApplicationById: getApplicationForInterview,
      createInterview: insertInterview,
    },
  );

  if (!result.ok) return { error: result.error };

  await syncGoogleCalendar({
    event: "created",
    interviewId: result.data.id,
    applicationId: result.data.applicationId,
    existingGoogleEventId: null,
    cancelled: false,
    scheduledAt: result.data.scheduledAt,
    location: result.data.location,
    participantEmails: result.data.participantEmails,
    profileId: user.id,
    organizationId: membership.organizationId,
  });

  revalidatePipeline(formData);
  return {};
}

export async function actualizarInterviewAction(
  _prev: InterviewActionState,
  formData: FormData,
): Promise<InterviewActionState> {
  const parsed = actualizarInterviewSchema.safeParse({
    interviewId: formData.get("interviewId"),
    scheduledAt: formData.get("scheduledAt"),
    mode: formData.get("mode"),
    type: formData.get("type"),
    status: formData.get("status"),
    location: formData.get("location") ?? undefined,
    notes: formData.get("notes") ?? undefined,
    participantEmails: collectParticipantEmails(formData),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const [user, membership] = await Promise.all([getCurrentUser(), getActiveMembership()]);
  if (!user || !membership) return { error: "No autorizado." };

  const result = await actualizarEntrevista(
    parsed.data,
    {
      userId: user.id,
      organizationId: membership.organizationId,
      role: membership.role,
    },
    {
      getInterviewById,
      updateInterview,
    },
  );

  if (!result.ok) return { error: result.error };

  await syncGoogleCalendar({
    event: "updated",
    interviewId: result.data.id,
    applicationId: result.data.applicationId,
    existingGoogleEventId: result.data.googleEventId,
    cancelled: result.data.status === "cancelled",
    scheduledAt: result.data.scheduledAt,
    location: result.data.location,
    participantEmails: result.data.participantEmails,
    profileId: user.id,
    organizationId: membership.organizationId,
  });

  revalidatePipeline(formData);
  return {};
}

export async function eliminarInterviewAction(
  _prev: InterviewActionState,
  formData: FormData,
): Promise<InterviewActionState> {
  const parsed = eliminarInterviewSchema.safeParse({
    interviewId: formData.get("interviewId"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const [user, membership] = await Promise.all([getCurrentUser(), getActiveMembership()]);
  if (!user || !membership) return { error: "No autorizado." };

  // Capturamos el estado ANTES de borrar: eliminarEntrevista solo devuelve { id }.
  const existing = await getInterviewById(parsed.data.interviewId, membership.organizationId);

  const result = await eliminarEntrevista(
    parsed.data,
    {
      userId: user.id,
      organizationId: membership.organizationId,
      role: membership.role,
    },
    {
      getInterviewById,
      deleteInterview,
    },
  );

  if (!result.ok) return { error: result.error };

  if (existing?.googleEventId) {
    await syncGoogleCalendar({
      event: "deleted",
      interviewId: result.data.id,
      applicationId: existing.applicationId,
      existingGoogleEventId: existing.googleEventId,
      cancelled: false,
      scheduledAt: existing.scheduledAt,
      location: existing.location,
      participantEmails: existing.participantEmails,
      profileId: user.id,
      organizationId: membership.organizationId,
    });
  }

  revalidatePipeline(formData);
  return {};
}
