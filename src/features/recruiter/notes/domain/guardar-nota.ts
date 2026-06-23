// ---- Tipos del caso de uso ----

export type GuardarNotaInput = {
  applicationId: string;
  // Texto libre. Vacío ("") → borra la nota. null → sin cambios (no debería llegar acá).
  notes: string;
};

export type GuardarNotaContext = {
  userId: string;
  organizationId: string;
  role: "owner" | "admin" | "recruiter" | "consultant";
};

export type GuardarNotaDeps = {
  getApplicationById: (
    applicationId: string,
    organizationId: string,
  ) => Promise<{ id: string; notes: string | null } | null>;
  updateNotes: (
    applicationId: string,
    notes: string | null,
  ) => Promise<{ id: string; notes: string | null }>;
};

// ---- Caso de uso ----

export async function guardarNota(
  input: GuardarNotaInput,
  ctx: GuardarNotaContext,
  deps: GuardarNotaDeps,
): Promise<
  | { ok: true; data: { id: string; notes: string | null } }
  | { ok: false; error: string }
> {
  // Las notas son internas del equipo reclutador; consultores no pueden escribirlas
  if (ctx.role === "consultant") {
    return { ok: false, error: "Los consultores no pueden editar notas internas." };
  }

  const application = await deps.getApplicationById(input.applicationId, ctx.organizationId);
  if (!application) {
    return { ok: false, error: "Postulación no encontrada." };
  }

  if (input.notes.length > 5000) {
    return { ok: false, error: "La nota no puede superar los 5.000 caracteres." };
  }

  // Texto vacío → almacenar null (limpia la nota)
  const normalizedNotes = input.notes.trim() === "" ? null : input.notes.trim();

  const updated = await deps.updateNotes(input.applicationId, normalizedNotes);
  return { ok: true, data: updated };
}
