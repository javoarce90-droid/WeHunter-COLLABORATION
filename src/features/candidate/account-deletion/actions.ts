"use server";

import { redirect } from "next/navigation";
import { getCurrentUser, getAccountType } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { eliminarCuenta } from "./domain/eliminar-cuenta";
import { getProfileCvPath, deleteResumeData, anonymizeProfile } from "./data/account-deletion.mutations";
import { deleteCandidateProfileCv } from "@/features/candidate/profile/data/profile.storage";
import { deleteAuthUser } from "./data/account-deletion.auth";

export interface EliminarCuentaState {
  error?: string;
}

/** Server Action: derecho de borrado — el candidato elimina su propia cuenta. Sin sesión
 * al final (se borró el usuario de Auth), por eso el redirect a un login público. */
export async function eliminarCuentaAction(): Promise<EliminarCuentaState> {
  const [user, accountType] = await Promise.all([getCurrentUser(), getAccountType()]);
  if (!user) {
    return { error: "No tenés sesión activa." };
  }

  const result = await eliminarCuenta(
    { userId: user.id, accountType },
    {
      getCvPath: getProfileCvPath,
      deleteCvFile: deleteCandidateProfileCv,
      deleteResumeData,
      anonymizeProfile,
      deleteAuthUser,
    },
  );

  if (!result.ok) {
    return { error: result.error };
  }

  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/c/login?cuenta_eliminada=1");
}
