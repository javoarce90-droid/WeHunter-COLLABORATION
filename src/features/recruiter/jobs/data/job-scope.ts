import { or, eq } from "drizzle-orm";
import { jobs } from "@/db/schema";

/** Búsquedas donde el membership es responsable o sourcer — condición compartida por las
 *  queries/mutations que aceptan `scopeToMembershipId` (roles acotados por asignación, ver
 *  `isAssignmentScoped` en `@/lib/auth/roles`). Compartido entre `jobs.queries.ts` y
 *  `jobs.mutations.ts` para no duplicar la condición. */
export function assignedToMembership(membershipId: string) {
  return or(eq(jobs.assignedTo, membershipId), eq(jobs.sourcerId, membershipId));
}
