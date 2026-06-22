## Qué hace este PR
<!-- 2-3 líneas: qué feature/cambio trae y por qué. -->

## Feature / área
<!-- ej: features/candidate/postulacion -->

## Auto-chequeo del autor (marcar antes de pedir review)
- [ ] La lógica de negocio está en `domain/`, no en la UI ni en `actions.ts`.
- [ ] El caso de uso chequea rol y organization (autorización primaria).
- [ ] Las queries usan el cliente RLS (`getDb()`), no el admin.
- [ ] Toda tabla nueva o modificada lleva `organization_id`.
- [ ] Hay test del caso de uso y pasa localmente.
- [ ] No toqué carpetas de features que no son mías.
- [ ] No commiteé ningún `.env`, clave ni secreto.
- [ ] `pnpm lint && pnpm typecheck && pnpm test` pasan.

## ¿Toca zona compartida?
- [ ] Schema (`src/db/`) — **avisé al líder y va la migración incluida**
- [ ] `components/ui/` o `lib/`
- [ ] Ninguna

## Notas para quien revisa
<!-- algo que mirar con atención, decisiones que tomaste, dudas. -->
