# Harness de evaluación de IA

Herramienta de **tuning de prompts**: corre un dataset de casos contra Gemini real usando los
mismos prompts que la app (`src/lib/ai/prompts.ts`) y reporta, por caso: **score, redFlags,
tokens (prompt/output/total) y latencia**. Sirve para comparar el efecto de un cambio de prompt
antes y después, y para detectar regresiones contra una franja de score esperada.

> No corre con `pnpm test` (no matchea `*.test.ts`). Pega a la API real y consume cuota: se
> dispara a propósito.

## Correr

```bash
pnpm ai:eval
```

Necesita `GEMINI_API_KEY` en `.env` (la misma que usa la app). Si falta, avisa y no hace nada.

Imprime una tabla en consola y escribe un CSV en `src/lib/ai/eval/results/` (gitignored).

## Evaluar con tus propios datos

Editá `dataset.json`. Cada caso es una `(búsqueda, candidato)`:

- `name`: etiqueta del caso.
- `band`: `[min, max]` del score que **esperás** (orientativo, marca regresiones). `null` = sin expectativa.
- `job` / `candidate`: tienen la forma de `ScoreApplicationInput` (`src/lib/ai/provider.ts`).

Agregá tantos casos como quieras: perfiles reales anonimizados, edge cases, etc.

## Flujo de tuning

1. Corré `pnpm ai:eval` y guardá el CSV base.
2. Ajustá el prompt en `src/lib/ai/prompts.ts` (`prompts.scoreApplication`).
3. Volvé a correr y compará scores/tokens contra el base.

## Extender a otras operaciones

Hoy evalúa `scoreApplication` (la única con salida estructurada/medible). Para evaluar otra
operación (ej. `draftJobPosting`), copiá `scoring.eval.ts` a un nuevo `*.eval.ts`, importá el
prompt correspondiente y adaptá qué medir (probablemente longitud/tokens y revisión cualitativa).
