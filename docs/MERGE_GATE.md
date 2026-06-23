# Control de calidad antes de mergear (rol del líder)

Sos quien lidera el proyecto. Tu control no depende de tu memoria ni de revisar todo línea por línea: se apoya en tres capas, de la más automática a la más humana.

## Capa 1 — Automática (no requiere que mires nada)
CI corre en cada PR: `lint`, `typecheck`, `test`. Si algo está rojo, **el merge se bloquea solo**.
Configurá *branch protection* en GitHub para que sea obligatorio (ver setup abajo).
> Principio: lo que NO puede "casi cumplirse" (tests, lint) va en CI, no en prosa.

## Capa 2 — Auto-chequeo del autor
Cada PR usa la plantilla (`pull_request_template.md`) con un checklist que el autor marca antes
de pedirte review. Te llega ya filtrado lo obvio.

## Capa 3 — Tu review (enfocada en riesgo, no en todo)
No revises todo igual. Mirá fuerte lo que puede hacer daño, y por arriba lo demás.

### Lo que NUNCA dejás pasar sin mirar (alto riesgo)
1. **Schema y migraciones** (`src/db/`): ¿toda tabla nueva tiene `organization_id`? ¿la migración
   está incluida en el PR? ¿no rompe datos existentes? Este es el punto #1.
2. **Aislamiento / RLS:** ¿se usó el cliente RLS y no el admin? ¿alguna query podría cruzar
   tenants? Si tocan RLS, leelo con lupa.
3. **Secrets:** ¿no se coló ningún `.env`, clave o token?

### Lo que mirás por arriba (medio riesgo)
4. **Capas:** ¿la lógica está en `domain/` y no desparramada en la UI?
5. **Test:** ¿el caso de uso nuevo tiene su test?

### Mecanismo que te cubre solo: CODEOWNERS
El archivo `.github/CODEOWNERS` hace que **GitHub te pida la review automáticamente** cuando un
PR toca `src/db/`, `.claude/`, `package.json` o `.github/`. Es decir: nadie puede mergear un
cambio de schema o de RLS sin tu aprobación, aunque se olviden de pedírtela. No depende de que
te acuerdes — lo fuerza la herramienta.

## Setup único en GitHub (15 minutos, hacelo al crear el repo)
1. **Branch protection** en `main` y `dev` (Settings > Branches):
   - Require a pull request before merging.
   - Require status checks to pass → seleccioná el check `CI`.
   - Require review from Code Owners.
   - (En `main`) Require approvals: 1.
2. Subí `.github/CODEOWNERS` con tu usuario real (reemplazá `@javi`).
3. Activá el PR template (ya está en `.github/pull_request_template.md`).
4. `pnpm prepare` activa el hook de pre-commit (husky) que corre lint en lo que se commitea.

## Disciplina de migraciones (la regla que evita romper la base)
- **Una migración por vez.** Si los dos generan a la vez, se pisan.
- El que va a tocar el schema: avisa → genera → mergea su migración → recién ahí el otro toca
  el schema. Coordinar por mensaje, siempre.

## Cadencia sugerida
- Merges a `dev` chicos y seguidos (una feature/caso de uso por PR). PRs gigantes son
  imposibles de revisar bien.
- Merge de `dev` a `main` solo cuando el sprint cierra y está probado en staging.
