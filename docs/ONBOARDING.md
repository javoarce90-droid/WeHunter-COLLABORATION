# Bienvenido al proyecto WeHunter 👋

Esta guía es para vos que recién te sumás. No asume que seas experto en código.
Leé los documentos en el orden de abajo y vas a entender cómo trabajamos.

## Paso 1 — Poné a andar el proyecto en tu compu
1. Cloná el repo: `git clone <url-del-repo>`
2. Instalá las dependencias: `pnpm install`
3. Copiá el archivo de variables: `cp .env.example .env`
4. Pedile a Javi los valores reales del `.env` (te los pasa por un canal seguro, NUNCA por el repo).
5. Probá que levanta: `pnpm dev`

## Paso 2 — Leé los documentos EN ESTE ORDEN
No saltees. Cada uno asume que leíste el anterior.

1. **`CLAUDE.md`** (raíz) — la foto general del proyecto: qué es, qué stack, las reglas que
   siempre aplican. Es lo mismo que lee Claude Code en cada sesión. Empezá por acá.
2. **`docs/DATA_MODEL.md`** — qué entidades hay (organizations, candidatos, búsquedas…) y cómo
   se relacionan. Es el "mapa" del producto. Clave para entender de qué se trata todo.
3. **`.claude/rules/architecture.md`** — cómo está organizado el código: las 3 capas y dónde
   va cada cosa. Si entendés esto, no te perdés.
4. **`.claude/rules/collaboration.md`** — cómo trabajamos los dos sin pisarnos: tu carpeta, las
   ramas, cómo se mergea. **Importante: leelo completo antes de tu primer commit.**
5. **`.claude/rules/database.md`** — reglas de la base de datos. Leelo cuando vayas a tocar algo
   que guarde o lea datos.
6. **`.claude/rules/conventions.md`** — nombres, formato. Consultá cuando tengas dudas de estilo.
7. **`docs/MERGE_GATE.md`** — cómo se revisa y aprueba el código antes de mergear (lo lidera Javi).

## Paso 3 — Cómo trabajás con Claude Code
- Abrí Claude Code dentro de la carpeta del proyecto. Lee el `CLAUDE.md` solo.
- Para crear una funcionalidad nueva, pedísela y Claude usa el skill `add-feature-slice`
  (en `.claude/skills/`), que arma la estructura correcta. No armes features a mano.
- Trabajá SOLO en tu carpeta de feature (te la asigna Javi; ver `collaboration.md`).
- Antes de pedir que mergeen tu trabajo: `pnpm lint && pnpm typecheck && pnpm test`.

## Reglas de oro (si te quedás con 3 cosas, son estas)
1. **No toques la carpeta de feature del otro.** Si necesitás un cambio ahí, avisá.
2. **Antes de tocar la base (`src/db/`), avisá a Javi.** Es zona compartida y sensible.
3. **Nunca subas el `.env` ni claves al repo.** Nunca.

## ¿Dudas de qué hace un rol o si algo entra en el alcance?
La fuente de verdad es el **flujo de usuarios** que definió el cliente. Si algo no está ahí,
no lo inventes ni lo expandas: preguntá a Javi.
