export type GenerarShareInput = {
  shortlistId: string;
  // Días hasta el vencimiento del link. null = sin vencimiento.
  expiresInDays: number | null;
};

export type GenerarShareContext = {
  userId: string;
  organizationId: string;
  role: "owner" | "admin" | "recruiter" | "consultant";
};

export type GenerarShareDeps = {
  getShortlistById: (
    shortlistId: string,
    organizationId: string,
  ) => Promise<{ id: string } | null>;
  generateToken: () => string;
  createShare: (data: {
    organizationId: string;
    shortlistId: string;
    token: string;
    expiresAt: Date | null;
    createdBy: string;
  }) => Promise<{ shareId: string; token: string }>;
};

export async function generarShare(
  input: GenerarShareInput,
  ctx: GenerarShareContext,
  deps: GenerarShareDeps,
): Promise<
  | { ok: true; data: { shareId: string; token: string } }
  | { ok: false; error: string }
> {
  if (ctx.role === "consultant") {
    return { ok: false, error: "Los consultores no pueden generar enlaces de shortlist." };
  }

  if (input.expiresInDays !== null && input.expiresInDays <= 0) {
    return { ok: false, error: "El vencimiento debe ser de al menos un día." };
  }

  const shortlist = await deps.getShortlistById(input.shortlistId, ctx.organizationId);
  if (!shortlist) {
    return { ok: false, error: "Shortlist no encontrado." };
  }

  const expiresAt =
    input.expiresInDays === null
      ? null
      : new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000);

  const token = deps.generateToken();

  const result = await deps.createShare({
    organizationId: ctx.organizationId,
    shortlistId: input.shortlistId,
    token,
    expiresAt,
    createdBy: ctx.userId,
  });

  return { ok: true, data: result };
}
