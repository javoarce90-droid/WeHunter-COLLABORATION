# Spec — Sourcing con IA (proveedor de datos: HarvestAPI)

**Dominio:** `sourcing-provider`
**Origen:** `integrar-harvestapi-sourcing` (archivado 2026-09-15).

> Convenciones: escenarios en Given/When/Then. Palabras clave RFC 2119: **DEBE**
> (obligatorio), **DEBERÍA** (recomendado), **PUEDE** (opcional). "Sourcing externo" =
> obtener perfiles nuevos de LinkedIn vía HarvestAPI. Los identificadores técnicos
> (`NEW_PROFILE`, `SourcingProvider`, etc.) son vocabulario de datos/arquitectura, no prosa a
> traducir.

---

## Requirements

### Requirement: Un solo flujo de Sourcing

**No existe más un modo "Sourcing Manual" separado.** Todo sourcing externo — desde la tab de
Sourcing o desde Postulados — corre sobre el mismo flujo de Sourcing con IA, respaldado por
HarvestAPI. Se elimina la pestaña "Sourcing Manual" (`SourcingView.tsx`), el componente
`LinkedInSourcingTab.tsx` y las server actions de búsqueda/scoring puntual por texto libre
(`buscarLinkedinAction`, `scorearCandidatoSourcingAction`).

#### Scenario: Un reclutador entra a Sourcing
- **Given** un reclutador con una búsqueda activa
- **When** entra a la sección de Sourcing
- **Then** ve un único flujo — sin selector de modo "IA" vs. "Manual"
- **And** el sistema arma la búsqueda solo, sin que el reclutador tenga que tipear nada

---

### Requirement: Descubrimiento y enriquecimiento en una sola llamada

El sistema DEBE obtener candidatos de LinkedIn a través de HarvestAPI en **una sola llamada**
que devuelva, para cada candidato: ubicación real, skills reales, experiencia, educación,
idiomas y certificaciones — no en llamadas separadas de "descubrir" y luego "enriquecer".
**Los endorsements quedan fuera de alcance** — no se muestran ni se estructuran.

#### Scenario: Resultado con perfil completo
- **Given** una búsqueda de Sourcing que devuelve candidatos nuevos
- **When** el sistema consulta a HarvestAPI
- **Then** cada candidato devuelto ya trae ubicación, skills, experiencia y educación reales
- **And** no hace falta una segunda consulta al proveedor para completar esos datos

---

### Requirement: Filtros estructurados, no texto libre tipo X-Ray

El sistema DEBE construir el filtro de búsqueda a HarvestAPI a partir del contexto de la
búsqueda (puesto, skills, seniority, ubicación) usando los **filtros server-side reales** que
el proveedor ofrece (país/estado/ciudad, título actual/pasado, industria, seniority/años de
experiencia) — no un query de texto libre tipo X-Ray armado a mano. Mismo principio de
producto: el reclutador no tipea nada.

Cuando la búsqueda no tiene ubicación cargada, el sistema DEBE aplicar un default configurable
(hoy "Argentina") como **filtro real de ubicación**, no como una palabra suelta dentro de un
texto de búsqueda.

#### Scenario: Búsqueda sin ubicación cargada
- **Given** una búsqueda sin `location`
- **When** se dispara Sourcing con IA
- **Then** el filtro de ubicación enviado a HarvestAPI usa el default configurable
- **And** los candidatos devueltos son efectivamente de ese país — filtro real, no heurística
  de texto que Google puede ignorar

---

### Requirement: Datos reales del perfil, nunca placeholders

La ubicación, las skills, la experiencia, la educación, los idiomas y las certificaciones
mostradas al reclutador DEBEN ser las del perfil real devuelto por HarvestAPI. El sistema
NUNCA DEBE mostrar un valor hardcodeado (como el anterior `"Ubicación en LinkedIn"`) ni los
términos del query de búsqueda disfrazados de skills del candidato. Los idiomas DEBEN
mapearse a la entidad "Idiomas" del candidato que ya existe en WeHunter (feature de
completitud de perfil), no a un dato de idiomas propio del sourcing.

#### Scenario: Ubicación real distinta al filtro usado
- **Given** un filtro de ubicación "Argentina"
- **When** HarvestAPI devuelve un candidato cuyo perfil real indica "Córdoba, Argentina"
- **Then** la card muestra "Córdoba, Argentina" — la ubicación real del perfil, no un
  placeholder ni el país usado como filtro

---

### Requirement: Detalle de perfil clickeable

La card de resultado DEBE poder abrirse para ver el detalle completo del perfil: experiencia,
educación, idiomas, certificaciones, skills, y el resto de los campos que HarvestAPI devuelve
(sin incluir endorsements). Disponible por igual en
las dos entradas al flujo (ver "Único punto de entrada compartido" más abajo), porque ambas
usan el mismo componente.

#### Scenario: Ver detalle completo de un candidato
- **Given** un resultado de Sourcing con perfil enriquecido
- **When** el reclutador hace clic en la card
- **Then** se abre el detalle con experiencia, educación y demás campos completos del perfil

---

### Requirement: Búsqueda única con cantidad configurable — sin "Buscar más"

El reclutador elige de antemano **cuántos candidatos quiere** (1 a `SOURCING_MAX_RESULTS`, hoy
10, con un selector tipo stepper) y dispara **una sola búsqueda** que trae esa cantidad de una
vez — sin cursor, sin variantes de query sucesivas, sin concepto de "página siguiente".

Los candidatos ya presentes en el Talent Pool del workspace se excluyen del conteo pedido
(no cuentan como parte de los N solicitados).

#### Scenario: Buscar 6 candidatos de una vez
- **Given** un reclutador en la pantalla de Sourcing de una búsqueda
- **When** elige "6" en el selector de cantidad y dispara la búsqueda
- **Then** el sistema trae hasta 6 candidatos nuevos en una sola operación
- **And** no hay ningún botón o acción para "traer más" sobre esa misma búsqueda

---

### Requirement: Los resultados de la última búsqueda persisten hasta "Limpiar"

Los resultados de la última búsqueda de Sourcing para una búsqueda laboral DEBEN seguir
visibles si el reclutador navega a otra pantalla y vuelve — no se pierden hasta que el
reclutador use una acción explícita de **"Limpiar"**. Al limpiar, se libera la búsqueda para
correr una nueva desde cero (nuevo selector de cantidad, nueva llamada al proveedor).

Ejecutar una nueva búsqueda **reemplaza** los resultados anteriores — no los acumula.

#### Scenario: Volver a la pantalla de Sourcing sin haber limpiado
- **Given** un reclutador que corrió Sourcing para "QA Semi Senior" y navegó a otra pantalla
- **When** vuelve a la pantalla de Sourcing de esa misma búsqueda
- **Then** sigue viendo los mismos resultados de la última búsqueda, sin tener que repetirla

#### Scenario: Limpiar y volver a buscar
- **Given** resultados de una búsqueda anterior todavía visibles
- **When** el reclutador usa "Limpiar" y dispara una nueva búsqueda
- **Then** los resultados anteriores desaparecen y se muestran solo los de la búsqueda nueva

---

### Requirement: Talent Pool antes de Sourcing externo

Reusa la regla ya cerrada en `sourcing-credits` (`limitar-sourcing-ia`): el aviso de candidatos
del Talent Pool se muestra antes de gastar Sourcing externo, sin importar qué proveedor lo
resuelve por detrás.

---

### Requirement: Registro de perfiles ya obtenidos — no pagar dos veces

El sistema DEBE persistir, a nivel organización, los perfiles ya obtenidos de HarvestAPI (con
los datos completos traídos), con un TTL configurable de **30–60 días**. Antes de consultar a
HarvestAPI por un perfil, el sistema DEBE verificar si ya existe una copia vigente persistida
y, de ser así, reutilizarla sin volver a pagar.

#### Scenario: Perfil ya obtenido hace 10 días
- **Given** un perfil de LinkedIn ya obtenido y persistido hace 10 días (dentro del TTL)
- **When** otra búsqueda de Sourcing vuelve a encontrar ese mismo perfil
- **Then** el sistema NO vuelve a consultarlo a HarvestAPI
- **And** reutiliza el dato ya persistido
- **And** el evento de consumo emitido es `REUSED_PROFILE`, no `NEW_PROFILE`

---

### Requirement: Evento de consumo hacia el sistema de créditos

Cada operación de Sourcing DEBE emitir, hacia la capa de consumo genérica definida en
`sourcing-credits` (`limitar-sourcing-ia`), el tipo de evento (`NEW_PROFILE`, `REUSED_PROFILE`,
`DUPLICATE`, `PROFILE_REFRESH`, `FAILED`) y el costo real asociado — sin que esa capa necesite
conocer ningún detalle de HarvestAPI.

Un duplicado contra el Talent Pool emite `DUPLICATE` y consume crédito igual que `NEW_PROFILE`
— ver requisito "Detección de duplicado contra el Talent Pool" más abajo y el requisito
"Duplicados" de `sourcing-credits`.

#### Scenario: Perfil nuevo pagado
- **Given** un candidato que no estaba persistido ni en el Talent Pool
- **When** el sistema lo obtiene de HarvestAPI y lo factura
- **Then** emite un evento `NEW_PROFILE` con el costo real de esa operación

---

### Requirement: Detección de duplicado contra el Talent Pool — post-perfil completo

HarvestAPI no permite comparar contra el Talent Pool antes de pagar el perfil completo: el paso
barato de búsqueda no trae una URL de LinkedIn comparable contra lo ya guardado. Por eso el
chequeo de duplicado ocurre **después** de obtener el perfil completo, no antes.

Una vez que el sistema tiene el perfil completo (con `linkedinUrl` real y email), DEBE
compararlo contra el Talent Pool de la organización por **ambas claves**: `linkedinUrl`
normalizada (`normalizeLinkedinKey`) Y email normalizado (`normalizeEmailKey`).

Si matchea por cualquiera de las dos claves, el resultado DEBE marcarse visualmente como "ya
está en tu Talent Pool", con una acción para ir a verlo ahí. **El crédito se consume igual**
(ver requisito "Duplicados" en `sourcing-credits`) — este requisito no afecta el cobro, solo la
detección y el aviso.

#### Scenario: Duplicado detectado por email, no por LinkedIn
- **Given** un candidato en el Talent Pool cargado por CV, con email `x@ejemplo.com` pero sin
  `linkedinUrl` guardada
- **When** Sourcing con IA devuelve un perfil completo de HarvestAPI con ese mismo email
- **Then** el sistema lo detecta como duplicado igual, aunque las URLs de LinkedIn no coincidan
- **And** el resultado se marca como "ya está en tu Talent Pool"

---

### Requirement: Interface de proveedor intercambiable (`SourcingProvider`)

El acceso a HarvestAPI DEBE pasar por una interface intercambiable — mismo patrón que
`AiProvider` (`src/lib/ai/provider.ts` + `getAiProvider()`). El dominio y la UI de Sourcing
NUNCA DEBEN llamar directo a la API HTTP del proveedor.

#### Scenario: El dominio no conoce al proveedor concreto
- **Given** el flujo de Sourcing con IA corriendo normalmente
- **When** se inspecciona el código de dominio/UI que orquesta el flujo
- **Then** no hay ninguna referencia directa a HarvestAPI — solo a la interface
  `SourcingProvider`

---

### Requirement: Plan de reversión a Serper

El cliente de Serper DEBE mantenerse en el código como una segunda implementación de
`SourcingProvider` (no se borra), seleccionable por variable de entorno/flag. Si HarvestAPI
falla en producción, DEBE ser posible volver a Serper sin rehacer código de dominio ni de UI.

#### Scenario: Activar el flag de reversión
- **Given** HarvestAPI fallando en producción
- **When** un administrador de plataforma activa el flag de reversión
- **Then** el sistema vuelve a usar Serper para el descubrimiento
- **And** no hace falta ningún cambio de código en `actions.ts` ni en la UI

---

### Requirement: Único punto de entrada compartido por la tab de Sourcing y Postulados

El componente de resultados DEBE seguir siendo compartido entre las dos entradas existentes al
flujo de Sourcing con IA:

- **Tab "Sourcing"**: el reclutador elige la búsqueda de un selector antes de ver resultados.
- **Botón dentro de Postulados**: ya está en el contexto de una búsqueda puntual — no hay
  selector, el panel se abre directo sobre esa búsqueda.

Ambas entradas DEBEN heredar automáticamente todos los cambios de este dominio (datos reales,
detalle clickeable) sin diseño duplicado. El detalle de perfil clickeable DEBE funcionar
correctamente en el panel lateral angosto de la entrada desde Postulados (`side="right"`), no
solo en la vista de página completa de la tab de Sourcing.

#### Scenario: Detalle de perfil desde Postulados
- **Given** un reclutador revisando Postulados de una búsqueda puntual
- **When** abre "Sourcing con IA" desde ahí y hace clic en un candidato para ver el detalle
  completo
- **Then** ve experiencia, educación y demás campos completos dentro del panel lateral
- **And** el layout no se rompe por el contenido adicional (más campos que hoy)

---

## Pendiente conocido

- Verificación visual real de la sección de detalle de perfil (`ResumeDetail`) contra un token
  real de HarvestAPI/Apify — no hecha todavía porque el entorno no tenía `APIFY_API_TOKEN`
  configurado. Cubierta por tests unitarios y tipos, pero no verificada en vivo.
- `findExistingLinkedinUrls` (`candidates.queries.ts`) quedó sin uso en producción tras
  generalizarse a `findExistingCandidateKeys` — no se borró, queda a decidir si se retira en
  una limpieza posterior.
- Implementar el consumo real de créditos (no solo el evento/seam) corresponde al dominio
  `sourcing-credits` de `limitar-sourcing-ia`.
