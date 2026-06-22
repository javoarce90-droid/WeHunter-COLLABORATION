# Regla: Colaboración (cómo trabajamos los dos sin pisarnos)

Somos dos personas trabajando en paralelo y mergeando en `dev`. Es la primera vez que
colaboramos con código, así que estas reglas son para evitar el caos. Seguilas al pie.

## Ownership de carpetas
- **Javi:** `src/features/candidate/` y el portal público.
- **Compañero:** `src/features/recruiter/`.
- **Regla de oro:** no edites una carpeta de feature que no es tuya. Si necesitás un cambio
  ahí, avisá y que lo haga el dueño. Esto elimina el 90% de los conflictos de merge.

## Zonas compartidas (coordinar SIEMPRE antes de tocar)
Estas las tocamos los dos, así que hay que avisarse antes:
- `src/db/schema/` — el modelo de datos. Cambios acá afectan a todos.
- `src/components/ui/` — el design system compartido.
- `src/lib/` — helpers compartidos.
- `CLAUDE.md` y `.claude/rules/` — las reglas del proyecto.

**Antes de modificar una zona compartida:** mandá un mensaje rápido ("voy a tocar el schema
para agregar la tabla interviews"). Evita que los dos cambien lo mismo a la vez.

## Ramas (branching)
- `main` = producción. No se commitea directo. Nunca.
- `dev` = integración. Acá mergeamos lo de los dos.
- `feat/<feature>-<que-hace>` = tu rama de trabajo. Ej: `feat/candidate-postulacion`.

Flujo:
1. Salís de `dev`: `git checkout dev && git pull && git checkout -b feat/candidate-x`
2. Trabajás, commiteás seguido con mensajes claros.
3. Antes de abrir PR: `git checkout dev && git pull` y mergeás dev en tu rama para resolver
   conflictos en tu cancha, no en la de dev.
4. Abrís Pull Request a `dev`. El otro lo revisa (aunque sea por arriba) antes de mergear.

## Migraciones de base = sequenciales
Si los dos generan una migración a la vez, se pisan. Regla: **una migración por vez**.
El que va a tocar el schema avisa, genera y mergea su migración antes de que el otro toque
el schema. Es molesto pero evita romper la base.

## Antes de cada commit
```bash
pnpm lint && pnpm typecheck && pnpm test
```
Si algo falla, no commitees. Código roto en `dev` nos frena a los dos.

## Cómo le hablamos a Claude Code
- Una sesión = una tarea acotada (ej: "implementá el caso de uso postularCandidato").
- Si Claude propone agregar una librería nueva, frenalo y verificá que haga falta.
- Si Claude empieza a tocar archivos fuera de tu feature, paralo.
- Pedile que escriba el test del caso de uso junto con el caso de uso.
