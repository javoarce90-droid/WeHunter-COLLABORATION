# Regla: Base de datos (Drizzle + Supabase + RLS)

## El gotcha que rompe en producción (memorizar)
Supabase da **tres** connection strings. Para una app Next.js en Vercel se usa el
**transaction pooler (puerto `:6543`)**. Ese pooler **no soporta prepared statements**,
así que el cliente postgres-js **debe** ir con `prepare: false`. Si lo omitís, funciona en
local y explota en producción. Esto ya está resuelto en `src/db/client.ts` — no lo cambies.

## Dos clientes de base (modelo de seguridad)
Tenemos dos clientes Drizzle y usar el correcto es crítico:

### Cliente RLS (`db.rls(...)`) — el que se usa SIEMPRE para operaciones de usuario
- Corre con el rol `authenticated` y el token del usuario.
- Postgres aplica las políticas RLS automáticamente: el usuario solo ve/toca lo que le corresponde.
- Es la red de seguridad que nos protege aunque la lógica de la app tenga un agujero.

### Cliente admin — solo para tareas de sistema controladas
- **Bypassea RLS.** Ej: un cron, una migración de datos, un webhook de sistema.
- **NUNCA** lo uses para responder a una acción de un usuario. Si dudás, es RLS.

## Modelo de autorización: server primero, RLS de respaldo
1. **Autorización primaria** en la capa `domain/`: chequeamos rol y pertenencia a la org
   en código, ANTES de tocar la base. Es explícita, legible y testeable.
2. **RLS de respaldo** en Postgres: aunque el código falle, la base niega el acceso cruzado.

Esto es defensa en profundidad. No es redundante: es lo que evita que un bug se convierta
en una filtración de datos entre clientes (tenants).

## Reglas de modelado
- **Toda tabla de dominio lleva `organization_id`** (FK a `organizations`). Sin excepción.
- Toda tabla lleva `id` (uuid), `created_at`, `updated_at`.
- Nombres de tabla y columna en **snake_case** y en **inglés** (`organization_id`, no `idOrg`).
- Relaciones: FK explícitas con `references()`. Definí índices en las FK que se filtran seguido.
- Las políticas RLS se definen junto al schema en Drizzle (soporta RLS nativo).

## Flujo de cambios de schema (¡COMPARTIDO!)
El schema en `src/db/schema/` lo tocan los dos. Es la zona de mayor riesgo de conflicto.
→ Antes de modificar el schema, leé `.claude/rules/collaboration.md`.
1. Editás el schema en TypeScript.
2. `pnpm db:generate` crea el archivo de migración.
3. `pnpm db:migrate` la aplica.
4. Commiteás schema + migración **juntos**. Nunca una sin la otra.

## Dónde se usa Drizzle
Solo en código de servidor: Server Components, Server Actions, route handlers. **Nunca** en
componentes cliente. La capa `data/` de cada feature es el único lugar con queries.
