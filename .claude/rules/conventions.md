# Regla: Convenciones

## Nombres
- Carpetas y archivos: `kebab-case` (`pipeline-stage.ts`).
- Componentes React: `PascalCase` (`CandidateCard.tsx`).
- Funciones y variables: `camelCase`.
- Casos de uso en `domain/`: verbos en español, camelCase (`postularCandidato`, `moverEtapa`).
- Tablas y columnas de base: `snake_case` en inglés (`organization_id`, `created_at`).
- Tipos y interfaces: `PascalCase` (`Candidate`, `JobStatus`).

## Imports
- Usá el alias `@/` para imports absolutos desde `src/` (`import { db } from "@/db/client"`).
- No imports relativos largos (`../../../`). Si aparecen, algo está mal ubicado.

## TypeScript
- `strict: true`. Nada de `any` salvo justificación explícita en un comentario.
- Tipos de dominio se definen una vez y se reusan. La fuente de verdad de los tipos de datos
  es el schema Drizzle (se infieren con `InferSelectModel` / `InferInsertModel`).

## Validación
- Todo input que entra por una server action se valida con **Zod** antes de llegar al dominio.
- El schema Zod vive cerca de la action que lo usa.

## Formato
- Lo maneja Prettier + ESLint. No discutas formato a mano: `pnpm lint --fix`.
- No metas reglas de formato en prosa acá; las hace el linter.

## Comentarios
- Comentá el *por qué*, no el *qué*. El código ya dice qué hace.
- Las reglas de negocio no obvias merecen una línea de contexto.

## Errores
- Los casos de uso devuelven resultados explícitos (ej. `{ ok: true, data }` /
  `{ ok: false, error }`), no tiran excepciones para control de flujo normal.
- Los errores de verdad (base caída, etc.) sí se propagan.
