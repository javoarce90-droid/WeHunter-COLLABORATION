"use server";

import { redirect } from "next/navigation";
import { getActiveMembership, getCurrentUser } from "@/lib/auth/session";
import { clientInputSchema } from "./schema";
import { crearCliente } from "./domain/crear-cliente";
import { editarCliente } from "./domain/editar-cliente";
import { insertClient, updateClientFields } from "./data/clients.mutations";

export interface ClientFormState {
  error?: string;
}

function parse(formData: FormData) {
  return clientInputSchema.safeParse({
    name: formData.get("name"),
    contactName: formData.get("contactName"),
    contactEmail: formData.get("contactEmail"),
    notes: formData.get("notes"),
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
    { insertClient },
  );
  if (!result.ok) return { error: result.error };

  redirect("/clients");
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
