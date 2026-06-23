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

## PERFORMANCE (reglas, no opcionales)
Estos son los errores que más se repiten y más caro salen. No son sugerencias.

### 1. Deduplicá auth y datos por request con `cache()` de React
El mayor problema de performance en server es pedir lo mismo varias veces en un mismo render
(ej. la membership en el layout y otra vez en la page = 2 transacciones para lo mismo).
- Envolvé en `cache()` de React todo lo que se pida más de una vez por request: la sesión/auth,
  la membership activa, el usuario actual. `cache()` garantiza que corre **una sola vez por
  request** aunque lo llames desde varios lados. Ya aplicado en `getAuth()` de `client.ts`.
- Regla: si una función de lectura se puede llamar desde el layout y desde la page, va con `cache()`.

### 2. `getUser()` vs `getSession()` (seguridad, no solo velocidad)
- `getUser()` valida el token contra el servidor de Supabase. Es la fuente **segura** de
  identidad → usalo para autorización. Es remoto (cuesta) → por eso va con `cache()`.
- `getSession()` lee la cookie sin validar. Sirve solo para sacar el token y pasárselo a RLS.
  **Nunca** uses su usuario/rol para autorizar: se puede falsificar.
- El costo de `getUser` NO se arregla cambiándolo por `getSession` (eso abre un hueco de
  seguridad). Se arregla con `cache()`.

### 3. Una transacción, no N
- No hagas una query (y por ende una transacción RLS) por cada dato. Ej: 3 KPIs = **una**
  query con varios `count(...)`/subqueries, no 3 transacciones separadas.
- Cada transacción RLS hace BEGIN → set claims → set role → SELECT → COMMIT. Contra el pooler
  eso es caro. Menos transacciones = mucho menos round-trips.

### 4. Siempre `limit` y paginación en listados
- Ninguna query de listado sin `limit`. Nunca traigas "todos los candidatos". Paginá.
- Traé solo las columnas que usás, no `select *` implícito de todo.

### 5. Índices en lo que filtrás
- Toda columna por la que filtrás u ordenás seguido necesita índice (empezando por
  `organization_id` y las FK). Si agregás un acceso nuevo, verificá que el índice exista.

### 6. Evitá N+1
- No hagas una query por cada item de una lista. Traé todo junto con join o `in`.

### 7. No bloquees el render con lo lento
- En Server Components, envolvé lo que depende de datos lentos en `<Suspense>` para que el
  resto de la página no espere. Traé datos independientes en paralelo (`Promise.all`).

### Observabilidad (para no enterarte tarde)
- Cada transacción RLS se mide con `measure()` (`src/lib/server-timing.ts`). En desarrollo
  vas a ver en la terminal cada query con su tiempo. **Si ves la misma etiqueta dos veces en
  un load, hay un round-trip duplicado → arreglalo con `cache()`.**
- Nombrá las queries al llamarlas: `db.rls(fn, "db.membership")`, así las reconocés.

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
