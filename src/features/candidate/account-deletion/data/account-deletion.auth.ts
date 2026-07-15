import { createSupabaseServiceClient } from "@/lib/supabase/service";

/**
 * Borra la cuenta de Supabase Auth. Requiere service role: la API de Supabase no tiene un
 * equivalente "auto-eliminarme" con el cliente de sesión. Seguro igual: el `userId` viene
 * siempre del servidor (la sesión ya validada en la action), nunca de un input del cliente —
 * esto no habilita borrar la cuenta de otra persona.
 */
export async function deleteAuthUser(userId: string): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.auth.admin.deleteUser(userId);
  if (error) {
    throw new Error(`No se pudo eliminar la cuenta de autenticación: ${error.message}`);
  }
}
