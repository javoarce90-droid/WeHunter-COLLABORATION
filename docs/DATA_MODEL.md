# Modelo de datos — WeHunter

Este documento es la fuente de verdad del dominio. El schema Drizzle (`src/db/schema/`) lo
implementa. Si cambia el dominio, se actualiza acá primero.

## Conceptos base

- **Organization (tenant):** el espacio de trabajo. Una consultora, un reclutador independiente
  o un equipo interno. **Todo dato de dominio pertenece a una organization.** Es la unidad de
  aislamiento: nadie ve datos de otra organization.
- **Profile:** un usuario de la app (espeja `auth.users` de Supabase). Una persona.
- **Membership:** vincula un profile con una organization y le da un rol. Una persona puede
  pertenecer a varias organizations.

## Actores (roles dentro de una organization)
- `owner` — dueño del workspace (facturación, todo).
- `admin` — administra usuarios y configuración.
- `recruiter` — opera búsquedas, candidatos, pipeline.
- `consultant` — reclutador externo con acceso acotado a búsquedas asignadas.

Aparte, fuera del modelo de organization:
- **Candidate (talento):** se registra por el portal público. **No pertenece a una organization**;
  es dueño de su propio perfil y sus postulaciones.
- **Hiring Manager / empresa:** revisa candidatos que un reclutador le comparte. Acceso por
  link con token, sin ver la base interna del reclutador.

## Rol Empresa / Hiring Manager (según el flujo de usuarios = fuente de verdad)
El documento de flujo de usuarios define el alcance y NO se modifica. Según ese flujo, la
Empresa **NO recluta por sí misma**: crea solicitudes (requisitions) y supervisa, mientras el
**reclutador crea la búsqueda y ejecuta el proceso**. El rol Empresa es de visibilidad,
feedback y aprobación, no de sourcing ni gestión de pipeline.

Flujo de la Empresa (textual del documento):
1. Ingresar (cuenta o link con token)
2. Crear solicitud (requisition)
3. Ver solicitudes
4. Revisar candidatos compartidos (magic link)
5. Feedback / aprobar
6. Coordinar entrevistas
7. Ver avance + reporte
8. Cerrar contratación

Conexión clave del documento: *"Empresa → Reclutador: solicitud en /requisitions → el
reclutador crea búsqueda y ejecuta proceso"*.

Por lo tanto **NO se modela una "empresa-organization" que recluta**. La organization sigue
siendo la unidad del reclutador/consultora. La Empresa interactúa con el sistema vía:
- `requisitions` — la solicitud que la empresa le hace al reclutador (entidad del flujo enterprise).
- `shortlist_shares` — acceso por token para revisar candidatos compartidos.

> **Cliente externo:** el mismo flujo de revisión (pasos 4–5) sin cuenta, solo con token.

## Cómo entran candidatos al pool del recruiter (dos caminos)
El pool (`candidates`, scopeado a la organization) se llena de dos formas:
1. **Carga manual:** el recruiter sube un candidato a mano (`profile_id = null`), no es usuario.
2. **Por postulación:** cuando un usuario del portal se postula a una búsqueda, se crea (o se
   reutiliza, si ya existía por email) un `candidate` en el pool de esa organization con su
   `profile_id` ya seteado, y luego la `application`. Es decir: postularse = entrar al pool.

Es la simetría del caso "invitar a registrarse": en un caso se parte del pool y se enlaza la
cuenta; en el otro se parte de la cuenta y se crea el candidato en el pool.

> **Caso borde (a manejar en el caso de uso):** si un usuario se postula y ya existía un
> candidato cargado a mano con el mismo email en esa organization, hay que **enlazar, no
> duplicar** (setear el `profile_id` del candidato existente).

## Candidato del pool vs. usuario del portal (decisión cerrada)
Son dos cosas que pueden referirse a la misma persona real:
- El **recruiter carga candidatos a mano** en su pool (`candidates`), aunque esas personas no
  sean usuarios de la app. Es lo normal: sube un CV de alguien que ni conoce WeHunter.
- Una persona puede además **registrarse sola** en el portal y tener su cuenta (`profiles`).

**Vínculo:** la tabla `candidates` tiene un campo opcional `profile_id`:
- `profile_id = null` → candidato fantasma, cargado por el recruiter, sin cuenta.
- `profile_id` seteado → ese candidato está vinculado a una cuenta de usuario real.

**Caso de uso "invitar candidato a registrarse":** toma un `candidate` con `profile_id = null`,
le envía una invitación; cuando la persona se registra y acepta, se setea su `profile_id`.
Así no se duplica el candidato: se enlaza el que ya existía. Una sola fila evoluciona de
"CV cargado a mano" a "candidato con cuenta activa".

## Entidades principales

| Entidad | Qué es | Pertenece a |
|---|---|---|
| `organizations` | el tenant / workspace | — |
| `profiles` | usuario de la app | — (persona) |
| `memberships` | profile ↔ organization + rol | organization |
| `jobs` | búsqueda / aviso | organization |
| `candidates` | persona en el pool del reclutador | organization |
| `applications` | candidato postulado a un job (con etapa fija) | organization |
| `interviews` | entrevista agendada | organization |
| `shortlists` | selección compartida a una empresa | organization |
| `shortlist_shares` | token de acceso para la empresa | organization |
| `requisitions` | solicitud que la empresa hace al reclutador (flujo enterprise) | organization |

> **Etapas del pipeline:** FIJAS por ahora (`new → screening → interview → offer → hired / rejected`),
> definidas como enum `application_stage` en el schema. No son configurables por organization.
> Si en el futuro se necesitan configurables, se migra a una tabla `pipeline_stages`.

> **Storage de CVs (Supabase Storage):** bucket **privado** `cvs`. Los archivos se sirven con
> URLs firmadas temporales. Las políticas del bucket replican el aislamiento por organization:
> solo miembros de la organization dueña pueden leer/escribir sus CVs. El path sugerido:
> `cvs/{organization_id}/{candidate_id}/{archivo}`.

## Relaciones clave
- `organizations` 1—N `memberships` N—1 `profiles`
- `organizations` 1—N `jobs`
- `jobs` 1—N `applications` N—1 `candidates`
- `applications` N—1 `pipeline_stages`
- `applications` 1—N `interviews`
- `jobs` 1—N `shortlists` 1—N (candidatos seleccionados)

## 🔑 DECISIÓN KEYSTONE (CERRADA con WeHunter)
**Cuando una empresa contrata a un reclutador para una búsqueda puntual, ¿qué ve?**

**DECIDIDO — Opción A:** la empresa ve **solo los candidatos del shortlist que el reclutador
le compartió para esa búsqueda**. No ve el pool completo del reclutador ni otras búsquedas.
Nunca ve: score de IA, red flags ni notas internas.

Implicancias implementadas:
- `shortlist_shares` apunta a candidatos puntuales, no a un job entero.
- RLS para el actor "empresa": solo accede a lo expuesto por un `shortlist_share` válido.

## Estrategia de aislamiento (multitenancy + RLS)
- Toda tabla de dominio lleva `organization_id`.
- **Autorización primaria (server):** los casos de uso chequean que el usuario tenga una
  membership en esa organization con el rol adecuado, antes de actuar.
- **RLS de respaldo (Postgres):** política base "el usuario solo accede a filas cuya
  `organization_id` está entre sus memberships". Para candidatos: "solo sus propias
  applications". Para empresas: "solo lo expuesto por un shortlist_share válido".

## Diferido a más adelante (no modelar ahora)
- Facturación / planes / entitlements (módulos por plan) — entra cuando toque Stripe.
- CRM de clientes (contactos) — fase posterior.
- Vectores / búsqueda semántica — solo si se prioriza IA avanzada.
