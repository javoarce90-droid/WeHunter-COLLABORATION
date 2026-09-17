# Propuesta / Requerimiento — Créditos de Sourcing externo

**Estado:** definiciones cerradas con la clienta 2026-09-10 · listo para diseño funcional
**Change:** `limitar-sourcing-ia`

---

## 1. Contexto y problema

**Sourcing con IA** busca en LinkedIn candidatos que todavía no se postularon, los puntúa
con IA contra el puesto y los muestra ordenados por afinidad — de un clic, más un botón
"Buscar más candidatos".

Para mejorar la calidad de los resultados se va a incorporar un **proveedor de datos de
LinkedIn** que devuelve el perfil completo (experiencia, educación, habilidades, ubicación
real). *(La elección y la integración de ese proveedor son un trabajo separado; este
documento no depende de cuál sea — ver `research-proveedores.md`.)*

Ese proveedor **tiene un costo variable por perfil obtenido**. Hoy Sourcing no tiene ningún
límite de uso, así que ese costo es ilimitado por cuenta y se come el margen del plan.

## 2. Objetivo

Que el costo del Sourcing externo sea **acotado, predecible y ligado al plan**, sin tocar
el resto de WeHunter, y que el uso por encima de lo incluido sea una venta, no una pérdida.

## 3. Alcance

### Dentro
- Un sistema de **créditos de Sourcing** por ciclo de facturación y por workspace.
- Consumo de créditos al obtener perfiles nuevos por Sourcing externo.
- **Compra de packs** de créditos adicionales.
- **Bloqueo del Sourcing externo** (y solo eso) al llegar a cero.
- **Visibilidad** del saldo para el reclutador.
- **Controles internos** para no volver a pagar por un perfil ya obtenido.
- **El Sourcing externo siempre asociado a una búsqueda activa** (ya es así hoy en el
  código — se formaliza como regla de negocio explícita, no una novedad técnica).
- **Matching contra el Talent Pool ofrecido antes del Sourcing externo** (no obligatorio,
  pero visible) — reusa la capacidad de matching que ya existe en el dominio.
- **Una capa de consumo genérica por detrás** (ver sección 6), aunque en esta fase al
  usuario solo se le muestren "créditos de Sourcing".

### Fuera
- **No se limitan búsquedas ni vacantes.** El reclutador crea y publica todas las que
  necesite.
- **No se limita ninguna otra función con IA** (puntuación de postulaciones, redacción de
  avisos, informe de entrevista, carga de CV). Corren sobre Gemini, costo marginal.
- **No se desarrollan los agentes de IA de Fase 2** — solo se deja la arquitectura lista.
- **La elección/integración del proveedor de perfiles** (trabajo separado, spike aparte).

## 4. Definiciones cerradas con la clienta

### 4.1 Unidad: crédito

- **1 crédito = 1 perfil nuevo obtenido por Sourcing externo.**
- Si una ejecución entrega 10 perfiles nuevos, consume 10 créditos.
- **No se cobra por perfiles ya obtenidos/pagados antes, ni por duplicados, ni por
  candidatos que ya están en el Talent Pool** (esos no consumen crédito).

### 4.2 Asignación

- **X créditos incluidos por ciclo de facturación, por workspace.** Se renuevan cada ciclo
  (los no usados no se acumulan al siguiente).
- El reclutador **distribuye los créditos como quiera**: todos en una vacante o repartidos.
- **Sin límite adicional de "tandas" por búsqueda.**
- La cantidad incluida es **configurable por plan** (Freelancer, Teams, …), **nunca
  hardcodeada**.

### 4.3 Packs adicionales

- El reclutador puede **comprar packs de créditos** cuando quiera.
- Los créditos comprados **no vencen con el ciclo** (se consumen después de los incluidos).
- Tamaño y precio del pack: **configurables**, a definir con el costo real del proveedor.

### 4.4 Al llegar a cero

- Se **bloquea únicamente el Sourcing externo**.
- El reclutador sigue usando con normalidad: búsquedas, pipeline, Talent Pool, clientes,
  entrevistas y todo el resto de WeHunter.
- Puede **esperar la renovación del ciclo** o **comprar un pack**.
- Mensaje claro con esas dos acciones.

### 4.5 Visibilidad

- Indicador de **créditos disponibles** (incluidos restantes + de packs) en la pantalla de
  Sourcing.
- **Aviso** cuando queden pocos.
- Al agotarse: mensaje con las acciones disponibles.

### 4.6 Números — cerrados por la clienta 2026-09-11

Estos valores son **configuración** (plan/pack), no código. Se cargan como datos de
referencia; el spike de proveedor puede llevar a ajustarlos, pero no a rediseñar el sistema.

| Plan | Precio | Créditos | Renovación |
|---|---|---|---|
| Free Trial | — | 10 créditos **totales** (14 días) | No renueva, no acumula |
| Freelancer | USD 29,90/mes | 250 créditos/ciclo | Por ciclo de facturación |
| Teams | USD 99,99/mes | 1.350 créditos/ciclo, **bolsa compartida** por todo el workspace (no por recruiter) | Por ciclo de facturación |

| Pack | Créditos | Precio |
|---|---|---|
| Chico | +250 | USD 9,90 |
| Mediano | +500 | USD 17,90 |
| Grande | +1.000 | USD 29,90 |

Comprar un pack **no modifica** el plan, la cantidad de usuarios ni las funcionalidades
disponibles — solo suma créditos comprados.

## 5. Controles internos de costo (no visibles)

- **No pagar dos veces:** antes de pedirle un perfil al proveedor, chequear si la
  organización ya lo tiene (Talent Pool, o ya obtenido en un sourcing anterior). Si sí, se
  reutiliza sin costo ni consumo de crédito.
- **Registro de perfiles ya obtenidos** a nivel organización, con los datos traídos, para
  reutilizarlos por un tiempo (ej. 30–60 días) sin volver a pagar.
- **Dedup ampliado:** hoy se compara solo por URL de LinkedIn; sumar email (el proyecto ya
  tiene esa lógica en otra parte) para detectar candidatos del pool cargados por CV.
- El consumo y el registro se cuentan a **nivel organización**, no por reclutador.

## 6. Condición de Fase 2 — capa de consumo configurable (diseñar ahora, no desarrollar)

La Fase 2 de WeHunter incorpora **agentes de IA que ejecutan acciones por el reclutador**
(sourcing, evaluación, contacto, follow-ups, coordinación de entrevistas). Ahí el consumo
**no siempre nace de un clic humano**: un agente puede necesitar consultar perfiles,
evaluarlos, descartar, buscar más, generar mensajes.

**Requisito de arquitectura para este change:**

- La lógica de planes/créditos **no debe quedar atada a "búsquedas de sourcing" ni a
  cantidad de clics**.
- Por detrás debe existir una **capa de consumo genérica**: distintos *tipos de consumo*,
  cada uno con su asignación configurable por plan, su saldo y su registro de eventos.
- En Fase 1, el único tipo de consumo visible al usuario es **"crédito de Sourcing"**.
- Cuando lleguen los agentes, se deben poder **agregar nuevos tipos de consumo, límites o
  presupuestos de ejecución sin rehacer** la lógica de planes/créditos.
- **No se implementa nada de agentes ahora** — solo se deja el modelo de datos y las
  interfaces preparados para esa evolución.

## 7. Qué NO cambia

- El sourcing sigue siendo de un clic, sin tipear nada.
- La calidad del match y el "por qué coincide" (mejora con el proveedor nuevo, aparte).
- Búsquedas, vacantes y el resto de WeHunter: sin límites nuevos.

## 8. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Dimensionar mal los créditos incluidos. | Números configurables por plan; arrancar conservador tras el spike y ajustar con uso real. |
| Percepción de "recorte". | Búsquedas/vacantes quedan ilimitadas; comunicar los créditos como parte del plan desde el onboarding; que lo incluido cubra el uso normal con holgura. |
| Complejidad de facturación de los packs (cobro único además de la suscripción). | Verificar soporte de dLocal Go para cobros únicos en el diseño técnico; si no lo soporta simple, MVP con créditos incluidos + bloqueo, y packs en una iteración siguiente. |
| Sobre-diseñar la capa de consumo por Fase 2. | Modelar lo genérico (tipos de consumo, asignación, saldo, eventos) pero implementar **solo** el tipo "sourcing"; sin abstracciones que no se ejerciten. |
| El proveedor cobra distinto de lo estimado. | El costo por perfil es configuración; los créditos se recalibran sin tocar código. |

## 9. Plan de reversión

Flag de sistema que vuelve el saldo de créditos efectivamente infinito → comportamiento
actual, sin quitar código. Los controles internos (no pagar dos veces, registro de perfiles
obtenidos, dedup ampliado) se mantienen aunque se desactiven los créditos.

## 10. Trabajo relacionado (fuera de este change)

- **Spike de evaluación de proveedor** (HarvestAPI vs Coresignal/Bright Data con búsquedas
  reales): mide costo por perfil útil, precisión de ubicación, duplicados, completitud.
  Salida = el costo que alimenta la configuración de créditos. ~1–2 días.
- **Integración del proveedor elegido** en el flujo de sourcing (reemplaza/complementa la
  API de Google actual).

---

## Próximos pasos (SDD)

1. ✅ Requerimiento — definiciones cerradas con la clienta
2. ⏭️ **Diseño funcional (spec)** — reglas de negocio y escenarios → validación con la clienta
3. Prototipo de UI → validación con la clienta
4. Diseño técnico
5. División en tareas
6. Implementación con TDD
7. Cierre
