# WeHunter — Contexto del proyecto

WeHunter es un ATS (software de reclutamiento) SaaS multi-tenant. Reescritura desde cero
sobre una demo previa (descartamos su código, conservamos funcionalidad e identidad visual).

> Este archivo es deliberadamente corto. El detalle vive en `.claude/rules/` y `docs/`.
> Leé el archivo de reglas que corresponda ANTES de escribir código de esa área.

## Comandos
```bash
pnpm dev              # levantar en local
pnpm db:generate      # generar migración a partir del schema (Drizzle)
pnpm db:migrate       # aplicar migraciones
pnpm db:studio        # inspeccionar la base
pnpm lint             # ESLint (corré esto antes de commitear)
pnpm typecheck        # tsc --noEmit
pnpm test             # tests de casos de uso
```

## Stack (no cambiar sin acordarlo entre los dos)
- Next.js (App Router) + TypeScript
- Supabase: Postgres + Auth + Realtime + Storage
- Drizzle ORM (schema en `src/db/schema/`)
- Autorización: en el servidor (capa de dominio) **+ RLS de respaldo** en Postgres
- UI: componentes en `src/components/ui` (identidad visual heredada de la demo)

## Arquitectura en una frase
La lógica de negocio vive en `features/<feature>/domain` (funciones puras, testeables).
La UI y las rutas son un caparazón delgado que llama a esa lógica. Nunca al revés.
→ Detalle en `.claude/rules/architecture.md`

## Estructura
```
src/
  app/                      # rutas Next.js (delgadas: routing + RSC)
  features/<feature>/
    domain/                 # casos de uso / reglas de negocio (puro, testeable)
    data/                   # queries y mutations con Drizzle
    ui/                     # componentes de la feature
    actions.ts              # server actions = puerta de entrada desde la UI
  db/schema/                # schema Drizzle (COMPARTIDO: ver collaboration.md)
  db/client.ts              # clientes admin + rls (ver database.md)
  lib/                      # auth, utils, helpers compartidos
  components/ui/            # design system compartido
```

## Reglas que SIEMPRE aplican
- **Ante cualquier duda de alcance o de cómo se comporta un rol, el flujo de usuarios definido
  por el cliente es la fuente de verdad. No inferir ni expandir alcance.** Si algo no está en
  el flujo, preguntar — no inventarlo.
- **Nunca pongas lógica de negocio en componentes ni en server actions.** Las actions
  validan input, llaman a un caso de uso de `domain/`, y devuelven el resultado.
- **Nunca uses el cliente admin de la base para operaciones de usuario.** Usá el cliente
  RLS. El admin es solo para tareas de sistema controladas. → `.claude/rules/database.md`
- **No inventes librerías ni APIs.** Si no estás seguro de que un paquete está instalado,
  revisá `package.json` primero. Si falta, avisá antes de agregarlo.
- **Toda tabla de dominio lleva `organization_id`.** El aislamiento entre tenants es
  sagrado. → `.claude/rules/database.md`
- **No edites carpetas de features que no son tuyas.** → `.claude/rules/collaboration.md`

## Antes de tocar cada área, leé su regla
- Base de datos / Drizzle / RLS / Supabase → `.claude/rules/database.md`
- Estructura, capas, dónde va cada cosa → `.claude/rules/architecture.md`
- Nombres, imports, formato → `.claude/rules/conventions.md`
- Ramas, ownership, cómo mergeamos → `.claude/rules/collaboration.md`
- Modelo de datos y entidades → `docs/DATA_MODEL.md`

## Para crear una feature nueva
Usá el skill `add-feature-slice` (en `.claude/skills/`). Genera la estructura completa
y consistente: domain → data → actions → ui. No armes features a mano.
