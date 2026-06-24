"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getActiveMembership } from "@/lib/auth/session";
import { insertCandidate } from "../candidates/data/candidates.mutations";
import {
  buildBooleanQuery,
  generateSourcingResults,
  platformToSource,
  SOURCING_PLATFORMS,
  type SourcingResult,
} from "./domain/sourcing";

const querySchema = z.object({
  keywords: z.array(z.string()).max(10),
  location: z.string().nullable(),
  seniority: z.string().nullable(),
  platforms: z.array(z.enum(SOURCING_PLATFORMS)).max(4),
});

export async function buscarSourcingAction(input: {
  keywords: string[];
  location: string | null;
  seniority: string | null;
  platforms: string[];
}): Promise<{ ok: boolean; boolean?: string; results?: SourcingResult[]; error?: string }> {
  const parsed = querySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Query inválida." };

  const membership = await getActiveMembership();
  if (!membership) return { ok: false, error: "No autorizado." };

  const results = generateSourcingResults(parsed.data);
  return { ok: true, boolean: buildBooleanQuery(parsed.data), results };
}

const importSchema = z.object({
  name: z.string().trim().min(1),
  headline: z.string().nullable(),
  location: z.string().nullable(),
  skills: z.array(z.string()),
  platform: z.enum(SOURCING_PLATFORMS),
});

export async function importarSourcingAction(result: {
  name: string;
  headline: string | null;
  location: string | null;
  skills: string[];
  platform: string;
}): Promise<{ ok: boolean; error?: string }> {
  const parsed = importSchema.safeParse(result);
  if (!parsed.success) return { ok: false, error: "Datos inválidos." };

  const membership = await getActiveMembership();
  if (!membership) return { ok: false, error: "No autorizado." };
  if (membership.role === "consultant") {
    return { ok: false, error: "Los consultores no pueden importar candidatos." };
  }

  await insertCandidate({
    organizationId: membership.organizationId,
    fullName: parsed.data.name,
    email: null,
    cvUrl: null,
    headline: parsed.data.headline,
    location: parsed.data.location,
    linkedinUrl: null,
    summary: null,
    skills: parsed.data.skills.length > 0 ? parsed.data.skills : null,
    source: platformToSource(parsed.data.platform),
  });

  revalidatePath("/candidates");
  return { ok: true };
}
