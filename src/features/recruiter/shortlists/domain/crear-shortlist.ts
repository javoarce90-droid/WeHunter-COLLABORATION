export type CrearShortlistInput = {
  jobId: string;
  name: string;
  // applications del pipeline de ese job que se incluyen en el shortlist
  applicationIds: string[];
};

export type CrearShortlistContext = {
  userId: string;
  organizationId: string;
  role: "owner" | "admin" | "recruiter" | "consultant";
};

export type CrearShortlistDeps = {
  getJobById: (
    jobId: string,
    organizationId: string,
  ) => Promise<{ id: string } | null>;
  // Devuelve los applicationIds (de los pedidos) que realmente pertenecen al job y la org.
  filterValidApplications: (
    jobId: string,
    organizationId: string,
    applicationIds: string[],
  ) => Promise<string[]>;
  createShortlistWithCandidates: (data: {
    organizationId: string;
    jobId: string;
    name: string;
    createdBy: string;
    applicationIds: string[];
  }) => Promise<{ shortlistId: string }>;
};

export async function crearShortlist(
  input: CrearShortlistInput,
  ctx: CrearShortlistContext,
  deps: CrearShortlistDeps,
): Promise<
  | { ok: true; data: { shortlistId: string } }
  | { ok: false; error: string }
> {
  if (ctx.role === "consultant") {
    return { ok: false, error: "Los consultores no pueden crear shortlists." };
  }

  const name = input.name.trim();
  if (name.length < 2) {
    return { ok: false, error: "El nombre del shortlist es demasiado corto." };
  }

  if (input.applicationIds.length === 0) {
    return { ok: false, error: "Seleccioná al menos un candidato para compartir." };
  }

  const job = await deps.getJobById(input.jobId, ctx.organizationId);
  if (!job) {
    return { ok: false, error: "Búsqueda no encontrada." };
  }

  // Solo incluimos applications que realmente pertenecen al job y la org (evita
  // que un id manipulado cuele un candidato de otra búsqueda/tenant).
  const validIds = await deps.filterValidApplications(
    input.jobId,
    ctx.organizationId,
    input.applicationIds,
  );
  if (validIds.length === 0) {
    return { ok: false, error: "Ningún candidato seleccionado es válido para esta búsqueda." };
  }

  const result = await deps.createShortlistWithCandidates({
    organizationId: ctx.organizationId,
    jobId: input.jobId,
    name,
    createdBy: ctx.userId,
    applicationIds: validIds,
  });

  return { ok: true, data: result };
}
