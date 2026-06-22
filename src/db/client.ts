import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import * as schema from "./schema";

/**
 * Clientes de base de WeHunter.
 *
 * GOTCHA CRÍTICO (no cambiar):
 * En Vercel usamos el TRANSACTION POOLER de Supabase (puerto :6543). Ese pooler NO soporta
 * prepared statements, por eso postgres-js va con { prepare: false }. Sin esto funciona en
 * local y explota en producción.
 *
 * Modelo de seguridad: dos clientes.
 *  - `admin`  -> bypassea RLS. SOLO para tareas de sistema controladas (crons, webhooks).
 *  - `db.rls` -> corre con el token del usuario. RLS aplica. Usar SIEMPRE para operaciones
 *                de usuario. Ver .claude/rules/database.md
 */

const config = { schema, casing: "snake_case" as const };

// Cliente admin: bypassea RLS. Usar con extremo cuidado.
const adminConnection = postgres(process.env.ADMIN_DATABASE_URL!, { prepare: false });
export const admin = drizzle({ client: adminConnection, ...config });

// Conexión protegida por RLS (rol authenticated).
const rlsConnection = postgres(process.env.DATABASE_URL!, { prepare: false });
const rlsBase = drizzle({ client: rlsConnection, ...config });

/**
 * Devuelve un cliente Drizzle ligado al usuario actual de Supabase.
 * Las queries corren bajo RLS con el token del usuario.
 *
 * Uso (solo en server: Server Components, Server Actions, route handlers):
 *   const db = await getDb();
 *   const rows = await db.rls((tx) => tx.select().from(schema.jobs));
 */
export async function getDb() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) =>
          toSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          ),
      },
    },
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token ?? "";

  // Ejecuta el callback inyectando el token del usuario para que RLS lo aplique.
  async function rls<T>(
    fn: (tx: typeof rlsBase) => Promise<T>,
  ): Promise<T> {
    return rlsBase.transaction(async (tx) => {
      await tx.execute(
        // setea el claim que las políticas RLS leen (request.jwt.claims)
        `set local request.jwt.claims = '${JSON.stringify({ sub: session?.user?.id, role: "authenticated" })}';`,
      );
      await tx.execute(`set local role authenticated;`);
      return fn(tx as unknown as typeof rlsBase);
    });
  }

  return { rls, token, userId: session?.user?.id ?? null };
}
