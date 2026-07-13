import { describe, it, expect, vi } from "vitest";
import { sincronizarEntrevista } from "./sincronizar-entrevista";
import type {
  SincronizarEntrevistaDeps,
  SincronizarEntrevistaInput,
  GoogleCalendarConnectionLike,
} from "./sincronizar-entrevista";

const ctx = { profileId: "user-1", organizationId: "org-1" };

const connection: GoogleCalendarConnectionLike = {
  id: "conn-1",
  accessToken: "access",
  refreshToken: "refresh",
  expiresAt: new Date(Date.now() + 3600_000),
};

const baseInput: SincronizarEntrevistaInput = {
  event: "created",
  interviewId: "int-1",
  existingGoogleEventId: null,
  cancelled: false,
  summary: "Entrevista — Ana Pérez (Backend SSR)",
  description: null,
  startsAt: new Date(Date.now() + 86_400_000),
  location: null,
  attendeeEmails: ["ana@example.com"],
};

function makeDeps(overrides?: Partial<SincronizarEntrevistaDeps>): SincronizarEntrevistaDeps {
  return {
    getConnection: vi.fn().mockResolvedValue(connection),
    createEvent: vi.fn().mockResolvedValue({ eventId: "gcal-1" }),
    updateEvent: vi.fn().mockResolvedValue({ ok: true }),
    deleteEvent: vi.fn().mockResolvedValue({ ok: true }),
    saveSyncResult: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("sincronizarEntrevista", () => {
  it("sin conexión: no sincroniza y limpia el estado de sync (no es un error)", async () => {
    const deps = makeDeps({ getConnection: vi.fn().mockResolvedValue(null) });
    const result = await sincronizarEntrevista(baseInput, ctx, deps);
    expect(result.ok).toBe(true);
    expect(deps.createEvent).not.toHaveBeenCalled();
    expect(deps.saveSyncResult).toHaveBeenCalledWith("int-1", {
      googleEventId: null,
      googleSyncError: null,
    });
  });

  it("created sin evento previo: crea el evento y guarda el id", async () => {
    const deps = makeDeps();
    const result = await sincronizarEntrevista(baseInput, ctx, deps);
    expect(result.ok).toBe(true);
    expect(deps.createEvent).toHaveBeenCalledWith(connection, expect.objectContaining({
      summary: baseInput.summary,
      attendeeEmails: ["ana@example.com"],
    }));
    expect(deps.saveSyncResult).toHaveBeenCalledWith("int-1", {
      googleEventId: "gcal-1",
      googleSyncError: null,
    });
  });

  it("updated con evento existente: actualiza el mismo evento", async () => {
    const deps = makeDeps();
    const result = await sincronizarEntrevista(
      { ...baseInput, event: "updated", existingGoogleEventId: "gcal-1" },
      ctx,
      deps,
    );
    expect(result.ok).toBe(true);
    expect(deps.updateEvent).toHaveBeenCalledWith(connection, "gcal-1", expect.any(Object));
    expect(deps.createEvent).not.toHaveBeenCalled();
  });

  it("updated sin evento previo (se conectó Calendar recién): crea el evento", async () => {
    const deps = makeDeps();
    const result = await sincronizarEntrevista(
      { ...baseInput, event: "updated", existingGoogleEventId: null },
      ctx,
      deps,
    );
    expect(result.ok).toBe(true);
    expect(deps.createEvent).toHaveBeenCalled();
  });

  it("updated con cancelled=true y evento existente: borra el evento en vez de actualizarlo", async () => {
    const deps = makeDeps();
    const result = await sincronizarEntrevista(
      { ...baseInput, event: "updated", existingGoogleEventId: "gcal-1", cancelled: true },
      ctx,
      deps,
    );
    expect(result.ok).toBe(true);
    expect(deps.deleteEvent).toHaveBeenCalledWith(connection, "gcal-1");
    expect(deps.updateEvent).not.toHaveBeenCalled();
    expect(deps.saveSyncResult).toHaveBeenCalledWith("int-1", {
      googleEventId: null,
      googleSyncError: null,
    });
  });

  it("deleted: borra el evento si existía", async () => {
    const deps = makeDeps();
    const result = await sincronizarEntrevista(
      { ...baseInput, event: "deleted", existingGoogleEventId: "gcal-1" },
      ctx,
      deps,
    );
    expect(result.ok).toBe(true);
    expect(deps.deleteEvent).toHaveBeenCalledWith(connection, "gcal-1");
  });

  it("deleted sin evento previo: no hace nada", async () => {
    const deps = makeDeps();
    const result = await sincronizarEntrevista(
      { ...baseInput, event: "deleted", existingGoogleEventId: null },
      ctx,
      deps,
    );
    expect(result.ok).toBe(true);
    expect(deps.deleteEvent).not.toHaveBeenCalled();
  });

  it("propaga el error y lo guarda en el estado de sync", async () => {
    const deps = makeDeps({
      createEvent: vi.fn().mockResolvedValue({ error: "invalid_grant" }),
    });
    const result = await sincronizarEntrevista(baseInput, ctx, deps);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe("invalid_grant");
    expect(deps.saveSyncResult).toHaveBeenCalledWith("int-1", {
      googleEventId: null,
      googleSyncError: "invalid_grant",
    });
  });
});
