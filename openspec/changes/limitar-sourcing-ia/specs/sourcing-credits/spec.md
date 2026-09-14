# Diseño funcional — Créditos de Sourcing externo

**Change:** `limitar-sourcing-ia` · **Dominio:** `sourcing-credits`
**Estado:** definiciones cerradas por la clienta 2026-09-11 (documento propio) — 1 punto de
lectura a confirmar (ver nota al final), resto para prototipo de UI.

> Convenciones: escenarios en Given/When/Then. Palabras clave RFC 2119: **DEBE**
> (obligatorio), **DEBERÍA** (recomendado), **PUEDE** (opcional). "Workspace" = organización
> = tenant. "Sourcing externo" = obtener perfiles nuevos de LinkedIn vía el proveedor pago.
> Los identificadores técnicos (`included_balance`, `NEW_PROFILE`, etc.) son los que definió
> la clienta y se mantienen literales — son vocabulario de datos, no prosa a traducir.

---

## ADDED Requirements

### Requirement: Planes y créditos incluidos

Cada plan DEBE tener un `credit_budget` — la cantidad de créditos que otorga por ciclo — **
configurable, no hardcodeado**.

| Plan | Precio | `credit_budget` | Usuarios | Vacantes |
|---|---|---|---|---|
| Free Trial | — | 10 créditos **totales** en 14 días | 1 | ilimitadas |
| Freelancer | USD 29,90/mes | 250/ciclo | 1 | ilimitadas |
| Teams | USD 99,99/mes | 1.350/ciclo, **bolsa compartida** del workspace | hasta 5 | ilimitadas |

El Free Trial es un caso especial: sus 10 créditos **no se renuevan ni se acumulan** — son
el total de los 14 días, no un `credit_budget` por ciclo.

**Las vacantes NUNCA se limitan**, en ningún plan.

#### Scenario: Trial se agota antes de los 14 días
- **Given** una cuenta en Free Trial con 10 créditos totales
- **When** el usuario consume los 10 créditos al día 5
- **Then** el Sourcing externo queda bloqueado hasta el fin del trial
- **And** no hay renovación dentro del período de prueba

---

### Requirement: Definición de crédito

**1 crédito = 1 perfil obtenido/procesado mediante Sourcing externo.** El sistema NUNCA
DEBE cobrar por clic, por tanda ni por ejecución — solo por perfil.

#### Scenario: Se piden 10, se obtienen 7
- **Given** un workspace con saldo suficiente
- **When** el recruiter dispara una búsqueda de Sourcing pidiendo 10 candidatos
- **And** el proveedor solo entrega 7 perfiles facturables
- **Then** se consumen 7 créditos, no 10

> **Nota:** qué cuenta exactamente como "perfil facturable" (especialmente ante duplicados)
> queda sujeto a la validación técnica del proveedor — ver el requisito "Duplicados: regla
> configurable pendiente de validación del proveedor" más abajo.

---

### Requirement: Estructura de saldos — tres campos, no uno

El saldo de un workspace DEBE modelarse con **tres campos separados**, nunca colapsados en
una sola variable:

- **`credit_budget`**: créditos que el plan otorga por ciclo (dato de configuración del
  plan, ej. Freelancer = 250).
- **`included_balance`**: créditos incluidos del ciclo actual que todavía están
  disponibles. Arranca en `credit_budget` al inicio del ciclo y solo baja.
- **`purchased_balance`**: créditos comprados en packs, acumulables, que **no vencen**.

El saldo visible para el usuario se calcula como:

```
available_balance = included_balance + purchased_balance
```

pero **internamente los tres campos deben permanecer separados** — nunca se persiste un
único `balance` que mezcle ambos orígenes, porque se necesita saber cuáles vencen y cuáles no.

#### Scenario: Saldo visible vs saldo interno
- **Given** un workspace con `included_balance = 250` y `purchased_balance = 180`
- **When** el reclutador mira su saldo de Sourcing
- **Then** ve "430 créditos disponibles"
- **And** internamente el sistema sigue distinguiendo 250 incluidos y 180 comprados

---

### Requirement: Renovación por ciclo de facturación

Los créditos incluidos se renuevan **según el ciclo de facturación del workspace**, no por
mes calendario. Al renovar: `included_balance` vuelve a `credit_budget` (los no usados del
ciclo anterior **vencen**, no se acumulan). `purchased_balance` **no se toca**.

Un cambio de plan (ej. Freelancer → Teams) DEBE aplicar el nuevo `credit_budget` recién
**desde el próximo ciclo** — sin prorratear el ciclo en curso. Es la opción más simple de
razonar y de implementar.

#### Scenario: Upgrade a mitad de ciclo
- **Given** un Freelancer (`credit_budget = 250`) a mitad de su ciclo actual
- **When** pasa a Teams (`credit_budget = 1.350`)
- **Then** el ciclo en curso sigue con las reglas de Freelancer
- **And** el nuevo `credit_budget` de 1.350 aplica recién en la próxima renovación

#### Scenario: Renovación de un Freelancer
- **Given** un Freelancer que termina su ciclo con `included_balance = 40` y
  `purchased_balance = 180`
- **When** el ciclo renueva
- **Then** `included_balance` pasa a 250 (los 40 vencen)
- **And** `purchased_balance` sigue en 180
- **And** el saldo disponible es 430

---

### Requirement: Orden de consumo — incluidos primero

Todo consumo DEBE descontar primero de `included_balance` y, solo al llegar a 0, empezar a
descontar de `purchased_balance`. Esto evita gastar créditos comprados (que no vencen)
mientras quedan créditos incluidos a punto de vencer.

#### Scenario: Consumo que cruza ambos saldos
- **Given** `included_balance = 20` y `purchased_balance = 250`
- **When** el reclutador obtiene 30 candidatos externos
- **Then** `included_balance` queda en 0
- **And** `purchased_balance` queda en 240

---

### Requirement: Packs de créditos adicionales

El reclutador PUEDE comprar packs de créditos en cualquier momento, incluso antes de llegar
a saldo cero. Tamaño y precio DEBEN ser configuración, no hardcodeados.

| Pack | Créditos | Precio |
|---|---|---|
| Chico | +250 | USD 9,90 |
| Mediano | +500 | USD 17,90 |
| Grande | +1.000 | USD 29,90 |

Los créditos de pack: **no vencen**, son **acumulables**, pertenecen al **workspace** (en
Teams, compartidos por todos los recruiters), y comprarlos **no modifica** el plan, la
cantidad de usuarios ni las funcionalidades disponibles.

#### Scenario: Compra preventiva
- **Given** un workspace con `included_balance = 30` (no está en cero)
- **When** el administrador compra el pack de +250
- **Then** `purchased_balance` suma 250 de inmediato
- **And** el plan y los usuarios habilitados no cambian

`purchased_balance` NO DEBE sobrevivir a la cancelación de la suscripción: al cancelarse,
los créditos comprados y no usados se pierden junto con el acceso.

#### Scenario: Cancelación con créditos de pack sin usar
- **Given** un workspace con `purchased_balance = 300` al momento de cancelar
- **When** la suscripción pasa a cancelada
- **Then** esos 300 créditos ya no están disponibles si el workspace reactiva más adelante
  (arranca de cero, no reflota saldo previo)

---

### Requirement: Sourcing externo siempre asociado a una búsqueda

**No existe Sourcing externo genérico.** El flujo DEBE ser:

```
Búsqueda activa → Talent Pool Matching → Sourcing externo → candidatos → Talent Pool
```

Todo consumo de Sourcing externo DEBE tener un `job_id` asociado. *(Esto ya es así en el
código actual — `sourcearParaBusquedaAction` exige `jobId` — se formaliza acá como regla de
negocio explícita para que ningún punto de entrada futuro la rompa, incluidos los agentes
de Fase 2.)*

Los candidatos obtenidos por Sourcing quedan **vinculados a la búsqueda que originó la
consulta** y se **incorporan al Talent Pool** del workspace.

**No hay tope de créditos por búsqueda.** Si una vacante difícil necesita los 250 créditos
de un ciclo Freelancer completo, el reclutador puede usarlos ahí.

#### Scenario: Créditos a punto de vencer, uso legítimo
- **Given** un reclutador con 80 créditos que vencen mañana y 3 búsquedas activas
- **When** distribuye esos 80 créditos entre las 3 búsquedas antes de que venzan
- **Then** el consumo es válido y los candidatos alimentan el Talent Pool

#### Scenario: Intento de Sourcing sin búsqueda
- **Given** un reclutador sin ninguna búsqueda activa seleccionada
- **When** intenta ejecutar Sourcing externo
- **Then** el sistema no lo permite — no hay "Sourcing genérico para llenar el Talent Pool"

---

### Requirement: Talent Pool antes de Sourcing externo

Antes de ofrecer Sourcing externo desde una búsqueda, el sistema DEBERÍA mostrar el
resultado de matchear esa búsqueda contra el Talent Pool del workspace (reusa
`matchearPoolConBusqueda`, ya existente en el dominio).

No es obligatorio revisarlo: el reclutador PUEDE ir directo a Sourcing externo. Pero
WeHunter DEBE mostrarle que hay candidatos propios disponibles antes de que gaste créditos.

#### Scenario: Hay candidatos en el pool
- **Given** una búsqueda de "Account Executive" con 18 candidatos del Talent Pool que
  matchean
- **When** el reclutador entra a Sourcing para esa búsqueda
- **Then** ve "Encontramos 18 candidatos en tu Talent Pool que podrían coincidir con esta
  búsqueda" con dos acciones: **Ver candidatos del Talent Pool** / **Buscar nuevos
  candidatos externos — consume créditos**
- **When** elige "Buscar nuevos candidatos externos" de todos modos
- **Then** el sistema lo permite sin objeción

**"Ver candidatos del Talent Pool" DEBE llevar directo al resultado, no a un punto de
partida vacío.** El sistema ya reusa `matchearPoolConBusqueda` (dominio) para calcular esos
18 — la acción DEBE abrir la pantalla de matching de candidatos (`MatchearPoolDialog`,
`/candidatos`) con esta búsqueda **ya seleccionada** y el resultado **ya visible**, sin que
el reclutador tenga que volver a elegir la búsqueda desde un desplegable. Como el cálculo
ya está cacheado por `(job, candidato)`, reabrirlo ahí no dispara una llamada nueva a la
IA — es una lectura de caché, no un costo repetido.

*(Aclarado 2026-09-11 en un comentario de la clienta sobre el prototipo: hoy
`MatchearPoolDialog` no acepta una búsqueda preseleccionada por URL/props — es trabajo
nuevo, chico, que entra al diseño técnico de este change.)*

#### Scenario: Ir al Talent Pool desde el aviso de Sourcing
- **Given** el aviso "Encontramos 18 candidatos..." para la búsqueda "Account Executive"
- **When** el reclutador hace clic en "Ver candidatos del Talent Pool"
- **Then** llega a `/candidatos` con el diálogo de matching abierto, la búsqueda "Account
  Executive" ya seleccionada y los 18 resultados ya mostrados
- **And** no se dispara un nuevo scoring de IA para los candidatos que ya estaban
  cacheados

---

### Requirement: Duplicados contra el Talent Pool — siempre consumen crédito

**Cerrado 2026-09-14**, resuelto con datos reales del proveedor elegido en
`integrar-harvestapi-sourcing` (ver `../integrar-harvestapi-sourcing/specs/sourcing-provider/spec.md`,
requisito "Detección de duplicado contra el Talent Pool"). Reemplaza la versión anterior de
este requisito ("pendiente de validación del proveedor").

**Un duplicado contra el Talent Pool consume crédito igual que cualquier perfil nuevo — sin
excepción.** `DUPLICATE` se trata igual que `NEW_PROFILE` a efectos de crédito.

**Por qué se cerró así**: una llamada de prueba real contra HarvestAPI mostró que el paso
barato de descubrimiento (`profileScraperMode: "Short"`, USD 0,10/página) devuelve una URL de
LinkedIn armada con el ID interno de LinkedIn, no la URL "vanity" (`/in/nombre-apellido`) que
usa el Talent Pool — **no hay forma de comparar contra el pool antes de pagar el perfil
completo** (`profileScraperMode: "Full"`, +USD 0,004/perfil, que sí trae la URL real y el
email). Como el costo al proveedor ya se pagó de todos modos al momento de poder detectar el
duplicado, no tiene sentido no cobrarle el crédito al cliente — la mitigación no es evitar el
cobro, es **avisarle** para que no vuelva a trabajar sobre un candidato que ya tenía.

El sistema, una vez que obtiene el perfil completo, DEBE compararlo contra el Talent Pool por
**ambas claves**: `linkedinUrl` normalizada Y email normalizado (hoy el dedup de Sourcing solo
usa `linkedinUrl` — se amplía a email en `integrar-harvestapi-sourcing`). Si matchea, el
resultado se marca como "ya está en tu Talent Pool" con link para verlo ahí, pero **el crédito
se consume igual**.

Esto **simplifica** el modelo de eventos: ya no hace falta el flag
`charge_on_provider_duplicate` — el `DUPLICATE` type queda como una etiqueta informativa (para
el registro de auditoría y para avisarle al reclutador), no como una bifurcación de cobro.

#### Scenario: Candidato de Sourcing que ya está en el Talent Pool
- **Given** un candidato en el Talent Pool con email `x@ejemplo.com` y LinkedIn `/in/x-apellido`
- **When** una búsqueda de Sourcing externo devuelve un perfil completo de HarvestAPI con ese
  mismo email o esa misma URL de LinkedIn
- **Then** se consume 1 crédito por ese perfil, igual que cualquier otro
- **And** el resultado se marca como "ya está en tu Talent Pool", con un link para verlo ahí

#### Scenario: Registro de auditoría de un duplicado
- **Given** el escenario anterior
- **When** se registra la operación (ver "Registro de consumo y costo real")
- **Then** el `tipo de acción` queda como `DUPLICATE` en el registro, a efectos informativos
- **And** el crédito consumido es el mismo que un `NEW_PROFILE` — 1

---

### Requirement: Registro de consumo y costo real

Cada operación de Sourcing DEBE generar un registro de auditoría con, como mínimo:
`workspace`, `usuario`, `búsqueda asociada` (`job_id`), `candidato/perfil`, `tipo de
acción`, `cantidad de créditos`, `origen del crédito` (incluido/comprado), `proveedor`,
`costo real o estimado`, `fecha/hora`, `resultado de la operación`.

El `tipo de acción` DEBE diferenciar al menos:

- `NEW_PROFILE` — perfil nuevo obtenido y facturado, consume crédito.
- `REUSED_PROFILE` — ya existía en el workspace, se reutilizó, no consume crédito.
- `DUPLICATE` — el perfil obtenido ya estaba en el Talent Pool (por `linkedinUrl` o email);
  consume crédito igual que `NEW_PROFILE`, es solo informativo (ver requisito "Duplicados").
- `PROFILE_REFRESH` — se volvió a pedir un perfil ya conocido para actualizar sus datos.
- `FAILED` — la operación no se completó (error del proveedor, timeout); no consume crédito.

Este registro DEBE permitir calcular, además de los créditos cobrados al cliente, el
**costo real/waste de WeHunter** — la diferencia entre lo que el proveedor facturó
internamente y lo que se le cobró en créditos al workspace.

#### Scenario: Créditos cobrados vs costo real del proveedor
- **Given** una ejecución que le entrega al reclutador 10 perfiles y consume 10 créditos
- **When** internamente el proveedor facturó 13 operaciones para llegar a esos 10 (3
  descartadas por duplicado/fallo)
- **Then** el registro deja "créditos cobrados: 10" y "costo proveedor: 13 operaciones"
  identificables por separado
- **And** esa diferencia es medible como costo/waste de WeHunter

---

### Requirement: Saldo insuficiente

El saldo nunca DEBE quedar negativo. Cuando el recruiter pide más candidatos de los que su
saldo permite, el sistema DEBE informarle el límite real **antes de ejecutar** y ofrecerle
elegir cómo seguir — no ejecutar en silencio una cantidad distinta a la pedida sin avisar.

#### Scenario: Pide 10, tiene 7
- **Given** un workspace con 7 créditos disponibles
- **When** el reclutador pide 10 candidatos nuevos
- **Then** el sistema le muestra "Tenés 7 créditos de Sourcing disponibles. Podés buscar
  hasta 7 candidatos o sumar créditos para continuar", con las opciones **Buscar 7
  candidatos** / **Comprar créditos**
- **When** elige "Buscar 7 candidatos"
- **Then** la ejecución se acota a 7 y consume exactamente 7 créditos

> **Nota de lectura (a confirmar con la clienta):** interpretamos esto como acotar el
> *pedido* al saldo disponible ANTES de correr la búsqueda (mostrando el aviso), no como
> ejecutar de más y recortar después. Si la intención era otra, avisar antes del prototipo.

---

### Requirement: Concurrencia en Teams — sin doble consumo

El saldo pertenece al workspace. Si dos o más recruiters ejecutan Sourcing externo al mismo
tiempo, el sistema DEBE evitar que el consumo combinado deje el saldo negativo. El
consumo/reserva de créditos DEBE manejarse de forma **transaccional**.

#### Scenario: Dos recruiters compiten por el mismo saldo
- **Given** un workspace Teams con 10 créditos disponibles
- **When** el Recruiter A pide 10 candidatos y el Recruiter B pide 10 candidatos, en
  simultáneo
- **Then** el saldo nunca pasa por un valor negativo
- **And** el total efectivamente consumido entre A y B nunca supera los 10 créditos
  disponibles al momento de empezar

---

### Requirement: Bloqueo del Sourcing externo con saldo cero

Con `available_balance = 0`, el sistema DEBE bloquear únicamente las **nuevas ejecuciones
de Sourcing externo**. El resto de WeHunter — búsquedas, postulaciones, pipeline, Talent
Pool, clientes, entrevistas y el resto de funcionalidades del plan — DEBE seguir
funcionando con normalidad.

El reclutador PUEDE esperar la renovación del ciclo o comprar un pack.

#### Scenario: Sourcing bloqueado, resto operativo
- **Given** un workspace con saldo 0
- **When** el reclutador intenta ejecutar Sourcing externo
- **Then** la ejecución no se realiza y se le ofrecen las dos acciones disponibles
- **When** el mismo reclutador crea una vacante, mueve un candidato en el pipeline o agenda
  una entrevista
- **Then** todas esas acciones funcionan normalmente

---

### Requirement: Créditos incluidos y planes configurables por plan

`credit_budget` (créditos por ciclo de cada plan) y los packs (tamaño/precio) DEBEN ser
**configuración**, nunca valores fijos en el código. Cambiarlos NO DEBE requerir un
despliegue.

#### Scenario: Ajustar el budget de Teams
- **Given** el plan Teams configurado en 1.350 créditos/ciclo
- **When** un administrador de la plataforma lo cambia a 1.500
- **Then** los workspaces Teams reciben 1.500 créditos desde su próximo ciclo, sin cambios
  de código

---

### Requirement: Proveedor desacoplado del sistema de créditos

El sistema de créditos DEBE funcionar sin conocer los detalles del proveedor de perfiles.
La integración del proveedor es responsabilidad de una capa aparte (fuera de este change):
el sistema de créditos solo necesita que esa capa le informe, por perfil, si el evento es
`NEW_PROFILE`, `REUSED_PROFILE`, `DUPLICATE`, `PROFILE_REFRESH` o `FAILED`, y el costo real
asociado.

---

### Requirement: Capa de consumo genérica (preparada para Fase 2)

El modelo de créditos DEBE implementarse sobre una **capa de consumo genérica**, sin atarse
a "búsquedas de sourcing" ni a clics:

- **Tipo de consumo**: en Fase 1 existe un único tipo (`sourcing_profile`).
- **Asignación por plan**: `credit_budget` por tipo de consumo, configurable.
- **Saldo por workspace**: `included_balance` + `purchased_balance` por tipo de consumo.
- **Registro de eventos**: cada consumo deja un evento con tipo, cantidad, origen y
  referencia. En Fase 1 el origen siempre es "reclutador"; el modelo DEBE admitir otros
  orígenes (ej. "agente") sin cambios de esquema.

Agregar un nuevo tipo de consumo, una nueva asignación por plan o un nuevo origen en Fase 2
**NO DEBE requerir rehacer** la lógica de planes, saldos ni facturación. En Fase 1 **solo se
implementa y se muestra** el tipo `sourcing_profile` — no se construye lógica de agentes.

---

### Requirement: Interruptor de reversión

El sistema DEBE tener un interruptor a nivel plataforma que, al activarse, haga que el
Sourcing externo funcione sin verificar ni consumir créditos (saldo efectivamente
infinito), sin quitar código. Los controles internos (Talent Pool antes de pagar, registro
de consumo) DEBEN seguir activos aunque el interruptor esté encendido.

---

### Requirement: Aviso de saldo bajo

El sistema DEBE avisar cuando el saldo disponible esté por debajo de un umbral, antes de
llegar a cero. El umbral DEBE ser configurable; el valor por defecto propuesto es **10% del
`credit_budget`** del plan — escala solo entre Freelancer y Teams sin tener que fijar un
número distinto por plan a mano.

#### Scenario: Aviso en Freelancer (budget 250 → umbral 25)
- **Given** un Freelancer con el umbral por defecto (10%)
- **When** el saldo disponible baja a 25 o menos
- **Then** la pantalla de Sourcing muestra el aviso de saldo bajo

#### Scenario: Aviso en Teams (budget 1.350 → umbral 135)
- **Given** un Teams con el umbral por defecto (10%)
- **When** el saldo disponible baja a 135 o menos
- **Then** la pantalla de Sourcing muestra el aviso de saldo bajo, igual que en Freelancer
  proporcionalmente
