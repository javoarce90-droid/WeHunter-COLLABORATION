import { getDb } from "@/db/client";
import { sourcingCreditEvents, type SourcingCreditEventType } from "@/db/schema";

export type InsertSourcingCreditEventArgs = {
  organizationId: string;
  jobId: string;
  userId: string | null;
  candidateKey: string;
  type: SourcingCreditEventType;
  costUsd: number;
  provider: string;
  occurredAt: Date;
  creditsCharged: number;
  creditSource: "included" | "purchased" | null;
};

/**
 * Deja el registro de auditoría de un evento de consumo de Sourcing externo
 * (`limitar-sourcing-ia/design.md` §2.3, spec.md "Registro de consumo y costo real") — siempre,
 * haya cobrado crédito o no. Es la fuente de verdad tanto de lo que se le cobró al cliente
 * (`creditsCharged`) como del costo real/waste interno (`providerCostUsd` vs. lo cobrado).
 */
export async function insertSourcingCreditEvent(
  args: InsertSourcingCreditEventArgs,
): Promise<void> {
  const db = await getDb();
  await db.rls(
    (tx) =>
      tx.insert(sourcingCreditEvents).values({
        organizationId: args.organizationId,
        jobId: args.jobId,
        userId: args.userId,
        candidateKey: args.candidateKey,
        eventType: args.type,
        creditsCharged: args.creditsCharged,
        creditSource: args.creditSource,
        providerCostUsd: args.costUsd.toFixed(4),
        provider: args.provider,
        occurredAt: args.occurredAt,
      }),
    "db.sourcing-credit-events.insert",
  );
}
