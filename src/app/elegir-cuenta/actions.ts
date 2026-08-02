"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PICK_ACCOUNT_COOKIE } from "@/lib/auth/pick-account";

const schema = z.object({ accountType: z.enum(["candidate", "recruiter"]) });

const HOME = { recruiter: "/dashboard", candidate: "/portal" } as const;

export interface PickAccountState {
  error?: string;
}

/**
 * Fija el tipo de cuenta elegido por un usuario que se acaba de dar de alta con OAuth.
 * Requiere la cookie que dejó el callback: sin ella no hay nada que elegir (y así esta
 * pantalla no queda como un cambiador de tipo de cuenta permanente).
 */
export async function elegirTipoDeCuenta(
  _prev: PickAccountState,
  formData: FormData,
): Promise<PickAccountState> {
  const parsed = schema.safeParse({ accountType: formData.get("accountType") });
  if (!parsed.success) {
    return { error: "Elegí una de las dos opciones." };
  }

  const cookieStore = await cookies();
  if (!cookieStore.get(PICK_ACCOUNT_COOKIE)) {
    return { error: "La elección expiró. Volvé a iniciar sesión." };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Se cerró la sesión. Volvé a iniciar sesión." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ account_type: parsed.data.accountType })
    .eq("id", user.id);
  if (error) {
    return { error: "No se pudo guardar. Probá de nuevo." };
  }

  cookieStore.delete(PICK_ACCOUNT_COOKIE);
  redirect(HOME[parsed.data.accountType]);
}
