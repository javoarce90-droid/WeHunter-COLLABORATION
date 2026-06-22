---
name: add-feature-slice
description: Usar SIEMPRE que haya que crear una feature o funcionalidad nueva en WeHunter (un caso de uso del reclutador, candidato, empresa, etc.). Genera la estructura completa y consistente de una feature slice — domain, data, actions, ui — respetando la arquitectura de capas del proyecto. Disparar ante pedidos como "implementá la postulación del candidato", "agregá el flujo de compartir shortlist", "creá la feature de entrevistas".
---

# Skill: crear una feature slice

Cuando creás una funcionalidad nueva en WeHunter, seguí SIEMPRE esta estructura. No improvises
otra organización: la consistencia es lo que mantiene el proyecto sano con dos personas + IA.

## 1. Leé las reglas primero
Antes de escribir código:
- `.claude/rules/architecture.md` — las 3 capas y el flujo.
- `.claude/rules/database.md` — clientes RLS, organization_id.
- `docs/DATA_MODEL.md` — entidades involucradas.

## 2. Estructura a generar
Para una feature `<nombre>` dentro de `src/features/<owner>/`:

```
features/<owner>/<nombre>/
  domain/
    <caso-de-uso>.ts        # la lógica de negocio, pura y testeable
    <caso-de-uso>.test.ts   # el test del caso de uso (obligatorio)
  data/
    <nombre>.queries.ts     # lecturas con Drizzle (cliente RLS)
    <nombre>.mutations.ts   # escrituras con Drizzle (cliente RLS)
  ui/
    <Componentes>.tsx       # componentes de la feature
  actions.ts                # server actions: validan (Zod) y llaman al dominio
  schema.ts                 # schemas Zod de input de esta feature
```

## 3. Orden de implementación (de adentro hacia afuera)
1. **Dominio primero.** Escribí el/los caso(s) de uso en `domain/`. Funciones puras que reciben
   datos validados + contexto del usuario (userId, organizationId, rol), aplican las reglas de
   negocio, y devuelven `{ ok: true, data }` o `{ ok: false, error }`. Sin Next, sin React.
2. **Test del dominio.** Escribí el `.test.ts` que ejercita el caso de uso sin UI ni base real.
3. **Data.** Implementá las queries/mutations que el dominio necesita, con el cliente RLS
   (`getDb()` de `@/db/client`). Nunca el admin.
4. **Actions.** En `actions.ts`: validá el input con Zod, obtené el usuario actual, llamá al
   caso de uso, devolvé el resultado. Cero lógica de negocio acá.
5. **UI.** Componentes que llaman a las actions. Usá `src/components/ui` para lo visual.

## 4. Checklist antes de terminar
- [ ] La lógica de negocio está en `domain/`, no en la UI ni en `actions.ts`.
- [ ] El caso de uso chequea rol y organization (autorización primaria).
- [ ] Las queries usan el cliente RLS, no el admin.
- [ ] Toda tabla nueva que se haya tocado lleva `organization_id`.
- [ ] Hay un test del caso de uso y pasa.
- [ ] Si tocaste `src/db/schema/`, avisaste al otro (zona compartida) y generaste la migración.
- [ ] `pnpm lint && pnpm typecheck && pnpm test` pasan.

## 5. No hacer
- No agregues una librería nueva sin verificar que haga falta y avisar.
- No edites carpetas de features que no son del owner que pediste.
- No metas queries directas en componentes.
