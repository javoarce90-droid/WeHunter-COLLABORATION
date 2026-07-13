# Regla: Flujo de trabajo

Trabajás solo en este proyecto (Ale ya no participa). No hay ownership de carpetas ni
coordinación entre personas que respetar — estas son las reglas que igual conviene mantener.

## Zona sensible: schema y RLS
`src/db/schema/` sigue siendo lo más riesgoso de tocar, trabajando solo o no: un error ahí
rompe la base real. Mismo cuidado de siempre — generar la migración, revisar el SQL antes de
aplicarlo, aplicar con `pnpm db:migrate` contra `DIRECT_DATABASE_URL`.

## Ramas (branching)
- `main` = producción. No se commitea directo.
- `dev` = integración, lo que se prueba antes de ir a producción.
- Cambios chicos/medianos pueden ir directo a `dev`. Para algo grande o riesgoso, una rama
  `feat/<qué-hace>` y merge a `dev` cuando esté probado.

## Remotos
Dos remotos configurados — confirmar siempre a cuál corresponde pushear:
- `client` (`Wehunter2026/WehunterPlatform`) — el repo real del cliente.
- `origin` (`javoarce90-droid/WeHunter-COLLABORATION`) — fork personal, ya no es el principal
  ahora que no hay colaboración con otra persona.

## Migraciones de base
Sin riesgo de pisarse con otra persona, pero seguí generando y aplicando de a una, revisando
el SQL antes de correr `pnpm db:migrate` contra la base real.

## docs/ no se versiona
`docs/` son notas internas — está en `.gitignore`, nunca se commitea. `CLAUDE.md` sigue
apuntando ahí para contexto (se lee del disco igual), pero no forma parte del historial del repo.

## Antes de cada commit
```bash
pnpm lint && pnpm typecheck && pnpm test
```
Si algo falla, no commitees.

## Cómo le hablás a Claude Code
- Una sesión = una tarea acotada.
- Si Claude propone agregar una librería nueva, frenalo y verificá que haga falta.
- Pedile que escriba el test del caso de uso junto con el caso de uso.
