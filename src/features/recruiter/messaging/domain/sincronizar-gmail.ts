import { ok, err, type Result } from "@/lib/result";
import type { OrgRole } from "@/lib/auth/session";
import { can } from "@/lib/auth/roles";

/**
 * Caso de uso: sincronizar el hilo de email de un candidato puntual con Gmail (§8 backlog).
 * Disparo manual (botón "Sincronizar con Gmail" en el hilo) — no hay cron ni webhooks: el
 * recruiter lo pide cuando quiere ver el historial real de intercambio con ese candidato.
 * Solo trae mensajes de/hacia el email de ESE candidato, nunca un crawl del inbox completo.
 */

export type SincronizarGmailContext = {
  organizationId: string;
  role: OrgRole;
};

export type GmailSyncedMessageInput = {
  externalId: string;
  direction: "outbound" | "inbound";
  body: string;
  sentAt: Date;
};

export type SincronizarGmailDeps = {
  getCandidate: (
    candidateId: string,
    organizationId: string,
  ) => Promise<{ id: string; email: string | null } | null>;
  /** Conexión de Google del recruiter actual (null = todavía no conectó su cuenta). */
  getConnection: () => Promise<{ id: string } | null>;
  fetchMessages: (candidateEmail: string) => Promise<GmailSyncedMessageInput[] | { error: string }>;
  ensureThread: (candidateId: string) => Promise<{ threadId: string }>;
  recordSyncedMessages: (threadId: string, items: GmailSyncedMessageInput[]) => Promise<number>;
};

export async function sincronizarGmail(
  candidateId: string,
  ctx: SincronizarGmailContext,
  deps: SincronizarGmailDeps,
): Promise<Result<{ synced: number }>> {
  if (!can(ctx.role, "messaging.send")) {
    return err("Los consultores no pueden sincronizar mensajes.");
  }

  const candidate = await deps.getCandidate(candidateId, ctx.organizationId);
  if (!candidate) {
    return err("Candidato no encontrado.");
  }
  if (!candidate.email) {
    return err("El candidato no tiene email cargado — no hay con qué buscar en Gmail.");
  }

  const connection = await deps.getConnection();
  if (!connection) {
    return err("Conectá tu cuenta de Google en Configuración → Integraciones primero.");
  }

  const fetched = await deps.fetchMessages(candidate.email);
  if ("error" in fetched) {
    return err(fetched.error);
  }

  const { threadId } = await deps.ensureThread(candidateId);
  const synced = await deps.recordSyncedMessages(threadId, fetched);
  return ok({ synced });
}
