import { ok, err, type Result } from "@/lib/result";
import type { OrgRole } from "@/lib/auth/session";

/**
 * Caso de uso: agregar una nota al timeline de una postulación (tabla `notes`).
 * Las notas son internas del equipo: el consultor no las escribe. Append-only (no edita
 * ni borra acá; eso queda como follow-up si hace falta).
 */

export interface AgregarNotaInput {
  applicationId: string;
  body: string;
}

export interface AgregarNotaCtx {
  userId: string | null;
  organizationId: string | null;
  role: OrgRole | null;
}

export interface AgregarNotaDeps {
  getApplicationById(
    applicationId: string,
    organizationId: string,
  ): Promise<{ id: string } | null>;
  insertNote(args: {
    organizationId: string;
    applicationId: string;
    body: string;
    createdBy: string;
  }): Promise<{ noteId: string }>;
}

export async function agregarNota(
  input: AgregarNotaInput,
  ctx: AgregarNotaCtx,
  deps: AgregarNotaDeps,
): Promise<Result<{ noteId: string }>> {
  if (!ctx.userId || !ctx.organizationId || !ctx.role) {
    return err("Necesitás estar autenticado en un workspace.");
  }
  if (ctx.role === "consultant") {
    return err("Los consultores no pueden escribir notas internas.");
  }

  const body = input.body.trim();
  if (body.length === 0) {
    return err("La nota no puede estar vacía.");
  }

  const application = await deps.getApplicationById(input.applicationId, ctx.organizationId);
  if (!application) {
    return err("Postulación no encontrada.");
  }

  const { noteId } = await deps.insertNote({
    organizationId: ctx.organizationId,
    applicationId: input.applicationId,
    body,
    createdBy: ctx.userId,
  });
  return ok({ noteId });
}
