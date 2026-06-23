import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";
import * as schema from "./schema";
import { measure } from "@/lib/server-timing";

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
 *
 * Performance: getAuth() está envuelto en cache() -> se ejecuta UNA vez por request aunque
 * llames getDb() varias veces. Y cada transacción RLS se mide con measure() para verla en
 * la terminal (dev) y detectar round-trips duplicados.
 */

const config = { schema, casing: "snake_case" as const };

// Cliente admin: bypassea RLS. Usar con extremo cuidado.
const adminConnection = postgres(process.env.ADMIN_DATABASE_URL!, { prepare: false });
export const admin = drizzle({ client: adminConnection, ...config });

// Conexión protegida por RLS (rol authenticated).
const rlsConnection = postgres(process.env.DATABASE_URL!, { prepare: false });
const rlsBase = drizzle({ client: rlsConnection, ...config });

/**
 * Auth del request, deduplicada por cache() (corre una sola vez por request).
 *
 * getUser() valida el token contra el servidor de Supabase -> es la fuente SEGURA de
 * identidad. Usala para autorización. Es remota (cuesta), por eso la cacheamos.
 * El access_token (para RLS) sale de la sesión (cookie). NUNCA uses el user/rol de
 * getSession() para autorizar: no está validado.
 */
export const getAuth = cache(async () => {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (
          toSet: {
            name: string;
            value: string;
            options?: Parameters<typeof cookieStore.set>[2];
          }[],
        ) =>
          toSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          ),
      },
    },
  );

  // Identidad validada contra el server (segura).
  const {
    data: { user },
  } = await measure("auth.getUser", () => supabase.auth.getUser());

  // Token para RLS (de la cookie; no se usa para autorizar).
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return { user, token: session?.access_token ?? null };
});

/**
 * Cliente Drizzle ligado al usuario actual. Las queries corren bajo RLS.
 * Solo en server (Server Components, Server Actions, route handlers).
 *
 * Uso:
 *   const db = await getDb();
 *   const rows = await db.rls((tx) => tx.select().from(schema.jobs), "db.jobs");
 *
 * El segundo argumento (label) es opcional pero recomendado: nombra la query en el
 * Server-Timing para que la reconozcas en la terminal.
 */
export async function getDb() {
  const { user, token } = await getAuth();

  async function rls<T>(
    fn: (tx: typeof rlsBase) => Promise<T>,
    label = "db.query",
  ): Promise<T> {
    return measure(label, () =>
      rlsBase.transaction(async (tx) => {
        await tx.execute(
          `set local request.jwt.claims = '${JSON.stringify({ sub: user?.id, role: "authenticated" })}';`,
        );
        await tx.execute(`set local role authenticated;`);
        return fn(tx as unknown as typeof rlsBase);
      }),
    );
  }

  return { rls, token, userId: user?.id ?? null };
}
