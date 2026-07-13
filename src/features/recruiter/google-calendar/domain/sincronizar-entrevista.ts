export type SincronizarEntrevistaEvent = "created" | "updated" | "deleted";

export type SincronizarEntrevistaInput = {
  event: SincronizarEntrevistaEvent;
  interviewId: string;
  existingGoogleEventId: string | null;
  // Solo relevante cuando event = "updated": una entrevista cancelada saca el evento del
  // calendario en vez de actualizarlo (no tiene sentido mantener una invitación a algo cancelado).
  cancelled: boolean;
  summary: string;
  description: string | null;
  startsAt: Date;
  location: string | null;
  attendeeEmails: string[];
};

export type SincronizarEntrevistaCtx = {
  profileId: string;
  organizationId: string;
};

export type GoogleCalendarConnectionLike = {
  id: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
};

export type CalendarEventPayload = {
  summary: string;
  description: string | null;
  startsAt: Date;
  location: string | null;
  attendeeEmails: string[];
};

export type SincronizarEntrevistaDeps = {
  getConnection: (
    profileId: string,
    organizationId: string,
  ) => Promise<GoogleCalendarConnectionLike | null>;
  createEvent: (
    connection: GoogleCalendarConnectionLike,
    payload: CalendarEventPayload,
  ) => Promise<{ eventId: string } | { error: string }>;
  updateEvent: (
    connection: GoogleCalendarConnectionLike,
    eventId: string,
    payload: CalendarEventPayload,
  ) => Promise<{ ok: true } | { error: string }>;
  deleteEvent: (
    connection: GoogleCalendarConnectionLike,
    eventId: string,
  ) => Promise<{ ok: true } | { error: string }>;
  saveSyncResult: (
    interviewId: string,
    result: { googleEventId: string | null; googleSyncError: string | null },
  ) => Promise<void>;
};

/**
 * Sincroniza una entrevista con el Google Calendar del recruiter que la creó. "Sin conexión"
 * NO es un error: simplemente no sincroniza (automática solo si hay conexión, ver backlog §7).
 * La decisión de crear/actualizar/borrar el evento vive acá (no en la action) para que sea
 * testeable sin pegarle a Google de verdad.
 */
export async function sincronizarEntrevista(
  input: SincronizarEntrevistaInput,
  ctx: SincronizarEntrevistaCtx,
  deps: SincronizarEntrevistaDeps,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const connection = await deps.getConnection(ctx.profileId, ctx.organizationId);
  if (!connection) {
    await deps.saveSyncResult(input.interviewId, { googleEventId: null, googleSyncError: null });
    return { ok: true };
  }

  const payload: CalendarEventPayload = {
    summary: input.summary,
    description: input.description,
    startsAt: input.startsAt,
    location: input.location,
    attendeeEmails: input.attendeeEmails,
  };

  // Cancelada con evento existente → sacarlo del calendario, no actualizarlo.
  const wantsDelete = input.event === "deleted" || (input.event === "updated" && input.cancelled);

  if (wantsDelete) {
    if (!input.existingGoogleEventId) {
      await deps.saveSyncResult(input.interviewId, { googleEventId: null, googleSyncError: null });
      return { ok: true };
    }
    const res = await deps.deleteEvent(connection, input.existingGoogleEventId);
    if ("error" in res) {
      await deps.saveSyncResult(input.interviewId, {
        googleEventId: input.existingGoogleEventId,
        googleSyncError: res.error,
      });
      return { ok: false, error: res.error };
    }
    await deps.saveSyncResult(input.interviewId, { googleEventId: null, googleSyncError: null });
    return { ok: true };
  }

  if (input.existingGoogleEventId) {
    const res = await deps.updateEvent(connection, input.existingGoogleEventId, payload);
    if ("error" in res) {
      await deps.saveSyncResult(input.interviewId, {
        googleEventId: input.existingGoogleEventId,
        googleSyncError: res.error,
      });
      return { ok: false, error: res.error };
    }
    await deps.saveSyncResult(input.interviewId, {
      googleEventId: input.existingGoogleEventId,
      googleSyncError: null,
    });
    return { ok: true };
  }

  const res = await deps.createEvent(connection, payload);
  if ("error" in res) {
    await deps.saveSyncResult(input.interviewId, { googleEventId: null, googleSyncError: res.error });
    return { ok: false, error: res.error };
  }
  await deps.saveSyncResult(input.interviewId, { googleEventId: res.eventId, googleSyncError: null });
  return { ok: true };
}
