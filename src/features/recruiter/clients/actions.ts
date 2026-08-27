"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getActiveMembership, getCurrentUser } from "@/lib/auth/session";
import {
  clientInputSchema,
  generarClientShareSchema,
  revocarClientShareSchema,
  enviarEmailAClienteSchema,
} from "./schema";
import { crearCliente } from "./domain/crear-cliente";
import { editarCliente } from "./domain/editar-cliente";
import { generarClientShare } from "./domain/generar-client-share";
import { revocarClientShare } from "./domain/revocar-client-share";
import { asignarRecruiterACliente } from "./domain/asignar-recruiter-a-cliente";
import { enviarEmailACliente } from "./domain/enviar-email-a-cliente";
import { insertClient, updateClientFields, assignRecruiterToClient } from "./data/clients.mutations";
import { getClientById } from "./data/clients.queries";
import { recordClientEmail } from "./data/client-emails.data";
import { getConnectionByProfile } from "@/features/recruiter/google-calendar/data/connections.queries";
import { hasGmailSendScope } from "@/features/recruiter/google-calendar/data/oauth-client";
import { sendGmailMessage } from "@/features/recruiter/google-calendar/data/gmail-client";
import { getMembershipById, getSoleActiveMembershipId } from "@/features/recruiter/team/data/team.queries";
import {
  createClientShare,
  generateClientShareToken,
  getClientShareById,
  revokeClientShare,
} from "./data/client-shares.data";

export interface ClientFormState {
  error?: string;
}

function parse(formData: FormData) {
  return clientInputSchema.safeParse({
    name: formData.get("name"),
    contactName: formData.get("contactName"),
    contactEmail: formData.get("contactEmail"),
    notes: formData.get("notes"),
    assignedMembershipId: formData.get("assignedMembershipId"),
  });
}

export async function crearClienteAction(
  _prev: ClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  const parsed = parse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const [user, membership] = await Promise.all([
    getCurrentUser(),
    getActiveMembership(),
  ]);

  const result = await crearCliente(
    parsed.data,
    {
      userId: user?.id ?? null,
      organizationId: membership?.organizationId ?? null,
      role: membership?.role ?? null,
    },
    {
      insertClient,
      getSoleActiveMembershipId,
      assignRecruiterToClient,
      getMembershipById,
      generateShareToken: generateClientShareToken,
      createClientShare,
    },
  );
  if (!result.ok) return { error: result.error };

  redirect(`/clients/${result.data.clientId}`);
}

export async function editarClienteAction(
  _prev: ClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  const clientId = String(formData.get("clientId") ?? "");
  const parsed = parse(formData);
  if (!clientId) return { error: "Falta el cliente a editar." };
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const membership = await getActiveMembership();
  const result = await editarCliente(
    { clientId, ...parsed.data },
    {
      organizationId: membership?.organizationId ?? null,
      role: membership?.role ?? null,
    },
    { updateClientFields },
  );
  if (!result.ok) return { error: result.error };

  redirect(`/clients/${clientId}`);
}

export interface ClientShareState {
  error?: string;
  shareToken?: string;
}

export async function generarClientShareAction(
  _prev: ClientShareState,
  formData: FormData,
): Promise<ClientShareState> {
  const parsed = generarClientShareSchema.safeParse({
    clientId: formData.get("clientId"),
    expiresInDays: formData.get("expiresInDays"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const [user, membership] = await Promise.all([getCurrentUser(), getActiveMembership()]);

  const result = await generarClientShare(
    parsed.data,
    {
      userId: user?.id ?? null,
      organizationId: membership?.organizationId ?? null,
      role: membership?.role ?? null,
    },
    { getClientById, generateToken: generateClientShareToken, createClientShare },
  );
  if (!result.ok) return { error: result.error };

  revalidatePath(`/clients/${parsed.data.clientId}`);
  return { shareToken: result.data.token };
}

export async function revocarClientShareAction(
  _prev: ClientShareState,
  formData: FormData,
): Promise<ClientShareState> {
  const parsed = revocarClientShareSchema.safeParse({
    shareId: formData.get("shareId"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const membership = await getActiveMembership();
  const result = await revocarClientShare(
    parsed.data,
    {
      organizationId: membership?.organizationId ?? null,
      role: membership?.role ?? null,
    },
    { getClientShareById, revokeClientShare },
  );
  if (!result.ok) return { error: result.error };

  const clientId = String(formData.get("clientId") ?? "");
  if (clientId) revalidatePath(`/clients/${clientId}`);
  return {};
}

export interface EnviarEmailAClienteState {
  ok?: boolean;
  error?: string;
}

export async function enviarEmailAClienteAction(
  _prev: EnviarEmailAClienteState,
  formData: FormData,
): Promise<EnviarEmailAClienteState> {
  const parsed = enviarEmailAClienteSchema.safeParse({
    clientId: formData.get("clientId"),
    subject: formData.get("subject"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const [user, membership] = await Promise.all([getCurrentUser(), getActiveMembership()]);
  if (!user || !membership) return { error: "No autorizado." };

  // La conexión de Google del recruiter (mismo mecanismo que la carta de oferta) se resuelve
  // acá, una sola vez, y se le pasa al dominio como `sendEmail`.
  const connection = await getConnectionByProfile(user.id, membership.organizationId);
  if (!connection) {
    return {
      error: "Conectá tu cuenta de Google en Configuración para poder enviar emails.",
    };
  }
  if (!hasGmailSendScope(connection)) {
    return {
      error: "Tu conexión de Google es anterior a esta función — reconectala en Configuración.",
    };
  }

  const result = await enviarEmailACliente(
    parsed.data,
    { organizationId: membership.organizationId, role: membership.role, userId: user.id },
    {
      getClient: getClientById,
      sendEmail: async (to, subject, body) => {
        const sent = await sendGmailMessage(connection, { to, subject, body });
        return sent.ok
          ? { ok: true, externalId: sent.externalId }
          : { ok: false, error: sent.error };
      },
      recordSent: (args) =>
        recordClientEmail({
          ...args,
          organizationId: membership.organizationId,
          createdBy: user.id,
        }),
    },
  );

  if (!result.ok) return { error: result.error };

  revalidatePath(`/clients/${parsed.data.clientId}`);
  return { ok: true };
}

export interface AsignarRecruiterState {
  error?: string;
}

export async function asignarRecruiterAClienteAction(
  _prev: AsignarRecruiterState,
  formData: FormData,
): Promise<AsignarRecruiterState> {
  const clientId = String(formData.get("clientId") ?? "");
  const membershipIdRaw = String(formData.get("membershipId") ?? "");
  if (!clientId) return { error: "Falta el cliente." };

  const membership = await getActiveMembership();
  const result = await asignarRecruiterACliente(
    { clientId, membershipId: membershipIdRaw || null },
    {
      organizationId: membership?.organizationId ?? null,
      role: membership?.role ?? null,
    },
    { getClientById, getMembershipById, assignRecruiterToClient },
  );
  if (!result.ok) return { error: result.error };

  revalidatePath(`/clients/${clientId}`);
  return {};
}
