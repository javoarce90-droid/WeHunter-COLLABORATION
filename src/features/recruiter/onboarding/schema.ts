import { z } from "zod";

/** Input de la action de onboarding. La validación fina vive cerca de la action. */
export const crearOrganizationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "El nombre del workspace es demasiado corto.")
    .max(80, "El nombre es demasiado largo."),
});

export type CrearOrganizationFormInput = z.infer<typeof crearOrganizationSchema>;
