import type { OrgRole } from "@/lib/auth/session";
import { can } from "@/lib/auth/roles";

export type EnviarEmailAClienteInput = {
  clientId: string;
  subject: string;
  body: string;
};

export type EnviarEmailAClienteContext = {
  organizationId: string;
  role: OrgRole;
  userId: string | null;
};

export type ClientForEmail = {
  id: string;
  name: string;
  contactName: string | null;
  contactEmail: string | null;
};

export type EnviarEmailAClienteDeps = {
  getClient: (clientId: string, organizationId: string) => Promise<ClientForEmail | null>;
  /** Envío real ya resuelto contra el Gmail conectado del recruiter (o el error de "conectá
   *  tu Google" si no hay conexión/scope) — se resuelve en la action, no acá. */
  sendEmail: (
    to: string,
    subject: string,
    body: string,
  ) => Promise<{ ok: true; externalId?: string } | { ok: false; error: string }>;
  recordSent: (args: {
    clientId: string;
    toEmail: string;
    subject: string;
    body: string;
    externalId?: string;
  }) => Promise<void>;
};

/**
 * Envía un email redactado a mano al contacto de un cliente y lo registra en el historial.
 * Si el envío falla NO se registra nada (mismo criterio que `enviarMensaje`: no dejar un
 * "enviado" que en realidad no salió). La autorización primaria (`clients.manage`) vive acá.
 */
export async function enviarEmailACliente(
  input: EnviarEmailAClienteInput,
  ctx: EnviarEmailAClienteContext,
  deps: EnviarEmailAClienteDeps,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!can(ctx.role, "clients.manage")) {
    return { ok: false, error: "Tu rol no permite escribirle a un cliente." };
  }

  const subject = input.subject.trim();
  const body = input.body.trim();
  if (subject.length === 0) {
    return { ok: false, error: "El asunto no puede estar vacío." };
  }
  if (body.length === 0) {
    return { ok: false, error: "El mensaje no puede estar vacío." };
  }

  const client = await deps.getClient(input.clientId, ctx.organizationId);
  if (!client) {
    return { ok: false, error: "Cliente no encontrado." };
  }
  if (!client.contactEmail) {
    return {
      ok: false,
      error: "El cliente no tiene un email de contacto. Cargalo en Editar.",
    };
  }

  const sent = await deps.sendEmail(client.contactEmail, subject, body);
  if (!sent.ok) {
    return { ok: false, error: sent.error };
  }

  await deps.recordSent({
    clientId: client.id,
    toEmail: client.contactEmail,
    subject,
    body,
    externalId: sent.externalId,
  });

  return { ok: true };
}
