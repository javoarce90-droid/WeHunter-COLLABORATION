/** Cuenta real (`profiles`) encontrada para vincular a un candidato cargado a mano.
 *  Ver `.claude/rules/database.md` — `profiles` nunca tuvo `organization_id`, es identidad
 *  global; vincular no comparte datos entre organizations, solo reconoce una cuenta real. */
export interface LinkableProfile {
  profileId: string;
  bio: string | null;
  skills: string[] | null;
  cvUrl: string | null;
}
