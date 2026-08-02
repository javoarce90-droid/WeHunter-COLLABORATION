import { z } from "zod";

export const WORKSPACE_TYPES = ["freelance", "team", "enterprise"] as const;
export type WorkspaceType = (typeof WORKSPACE_TYPES)[number];

/** Input de la action de onboarding. La validación fina vive cerca de la action. */
export const crearOrganizationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "El nombre del workspace es demasiado corto.")
    .max(80, "El nombre es demasiado largo."),
  workspaceType: z.enum(WORKSPACE_TYPES, {
    errorMap: () => ({ message: "Elegí cómo vas a usar WeHunter." }),
  }),
});

export type CrearOrganizationFormInput = z.infer<typeof crearOrganizationSchema>;
