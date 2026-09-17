# Propuesta — Integrar HarvestAPI como proveedor de Sourcing

**Estado:** propuesta inicial, pendiente de validación · 2026-09-14
**Change:** `integrar-harvestapi-sourcing`
**Relacionado:** `limitar-sourcing-ia` (sistema de créditos, diseñado vendor-agnóstico; este
change es la "integración del proveedor elegido" que esa proposal dejó marcada como trabajo
separado en su sección 10).

---

## 1. Contexto y problema

Sourcing con IA busca candidatos en LinkedIn que no se postularon, los puntúa con Gemini
contra el puesto y los muestra ordenados por afinidad. Hoy el descubrimiento corre sobre
**Serper** (API de resultados de Google) con X-Ray queries armadas por
`buildJobSourcingQueryVariant` (`src/features/recruiter/sourcing/domain/sourcear-para-busqueda.ts`),
contra `searchLinkedInCandidates` (`domain/linkedin-search.ts`).

Ese enfoque tiene un techo estructural, ya diagnosticado:

- **Ubicación no confiable**: `gl` en Serper es sesgo de idioma/país de Google, no filtro de
  residencia real; el campo `location` que se muestra está **hardcodeado** como
  `"Ubicación en LinkedIn"` (`linkedin-search.ts:186`).
- **Skills falsas**: lo que se muestra como "skills" del candidato son en realidad los
  términos del query de búsqueda (`linkedin-search.ts:176-180`), no habilidades reales del
  perfil.
- **Sin experiencia ni educación estructuradas**: Google Search no devuelve el perfil
  completo, solo el snippet indexado.
- **Sin filtros server-side reales** (ubicación, seniority, industria) — todo depende de
  cuán bien arme el query el X-Ray.

La investigación de mercado (2026-09-10, ver `../limitar-sourcing-ia/research-proveedores.md`)
identificó **HarvestAPI** como el proveedor que resuelve esto en **una sola llamada**
(search + enrichment), sin cuenta de LinkedIn, con filtros server-side reales y a costo bajo
(~USD 0,14 por tanda de 10 perfiles, ~14× más barato que la alternativa de dataset
Coresignal).

## 2. Objetivo

Reemplazar el descubrimiento + enriquecimiento de Serper por HarvestAPI, para que Sourcing
con IA devuelva **ubicación real, skills reales, experiencia y educación** del candidato —
manteniendo el mismo contrato de producto ("1 clic, sin tipear nada") y sin tocar el scoring
de Gemini, que ya es correcto y ya corre en batch (una sola llamada por tanda).

## 3. Decisión de alcance (usuario, 2026-09-14)

Se **adopta HarvestAPI directamente**, sin correr primero el spike comparativo formal
(HarvestAPI vs. un segundo proveedor con búsquedas reales de WeHunter) que la investigación
de mercado recomendaba como paso previo. La decisión se apoya en la investigación ya hecha
(comparación de precio, filtros, dedup nativo y frescura contra Coresignal/Bright
Data/ScrapingDog).

**Riesgo aceptado explícitamente**: no hay validación empírica propia de precisión de
ubicación, tasa de duplicados ni completitud de campos contra el uso real de WeHunter antes
de integrar. Se mitiga con rollout gradual y monitoreo de las primeras tandas reales (ver
§8, Plan de reversión).

## 3.1 Definiciones cerradas — ronda 2 (usuario, 2026-09-14)

- **Serper se retira**, no queda de fallback. HarvestAPI reemplaza el descubrimiento +
  enriquecimiento por completo.
- **Experiencia y educación se estructuran** en el schema (no se aplanan a `summary`).
  Resuelve la pregunta §6.4 — queda para diseño técnico definir las tablas/columnas.
- **Sourcing Manual desaparece.** Con HarvestAPI, el sourcing estructurado (filtros reales
  de ubicación/seniority/industria) cubre lo que Sourcing Manual resolvía con texto libre
  sobre Serper. **Un solo flujo de Sourcing**, no dos. Esto es alcance nuevo respecto a la
  proposal original — ver impacto en §4 y §6.5.
- **Apify actor** queda como default operativo (pricing conocido, `harvestapi/linkedin-profile-search`),
  no la API directa. *(Corrección a una afirmación del usuario: HarvestAPI **sí** tiene API
  HTTP propia e independiente de Apify — `api.harvestapi.io`, autenticación con API key
  propia generada en su dashboard, sin cuenta de Apify. Confirmado en
  `docs.harvestapi.io/guides/quickstart`, 2026-09-14. La razón para no usarla ahora no es que
  no exista, sino que su pricing no está publicado — hay que cotizarlo. Revisable apenas se
  tenga ese número.)*

## 3.2 Definiciones cerradas — ronda 3 (usuario, 2026-09-14)

- **Facturación de HarvestAPI**: confirmado contra la doc pública del actor de Apify
  (`apify.com/harvestapi/linkedin-profile-search`) que **búsqueda y perfil completo SON
  eventos de cobro separados**: USD 0,10 por página de búsqueda (se cobra aunque la página
  devuelva 0 resultados) + USD 0,004 por perfil completo. Queda **un solo punto sin
  confirmar**, y se prueba con una llamada real antes de cerrar la regla `Duplicados` del
  spec de créditos: si el paso de "search" (el barato, USD 0,10/página) ya devuelve la URL de
  LinkedIn de cada resultado — de ser así, WeHunter puede filtrar duplicados del Talent Pool
  **antes** de pagar el perfil completo (USD 0,004), y solo el fee fijo de página queda sin
  poder evitarse. La doc pública no lo especifica ("returns a list of search items, not
  profiles" — sin detalle de campos). *Pendiente: correr una llamada de prueba real (requiere
  un token de Apify — ver siguiente mensaje al usuario).*
- **Estructura de experiencia/educación en el schema**: se deja explícitamente para la fase de
  diseño técnico, no se cierra en el spec funcional.
- **Alcance de "estructurar el perfil"**: además de experiencia y educación, **también se
  estructuran idiomas y certificaciones** (HarvestAPI los devuelve). Idiomas reusa la entidad
  "Idiomas" del candidato que ya existe en WeHunter (de la feature de completitud de perfil),
  no se crea un dato de idiomas separado para Sourcing. **Endorsements queda fuera de
  alcance** — son los avales entre usuarios de LinkedIn a las skills de un perfil ("Fulano
  avaló a Fulano en Python"); no se van a mostrar ni estructurar en esta fase.
- **Cotización de API directa vs. Apify**: no se cotiza — Apify queda de default, sin abrir
  esa comparación por ahora.
- **TTL de perfiles persistidos**: confirmado el rango 30–60 días (era una sugerencia de la
  investigación de mercado, ahora aprobada explícitamente como decisión, no solo heredada).

## 3.3 Cierre de la regla de Duplicados (usuario, 2026-09-14)

Con la prueba real de HarvestAPI hecha (ver §3.2), se cerró la última pregunta abierta:
**un duplicado contra el Talent Pool siempre consume 1 crédito**, igual que cualquier perfil
nuevo — no hay excepción ni flag de configuración. La mitigación para el reclutador no es
evitar el cobro (técnicamente no se puede, sin forma barata de detectar el duplicado antes de
pagarle a HarvestAPI), sino **detectarlo después y avisarle**: una vez obtenido el perfil
completo, el sistema lo compara contra el Talent Pool por LinkedIn URL **y** email (hoy el
dedup de Sourcing solo usa LinkedIn URL), y si matchea lo marca como "ya está en tu Talent
Pool" con acceso directo. Esto cierra el requisito "Duplicados" de `limitar-sourcing-ia`
(`../limitar-sourcing-ia/specs/sourcing-credits/spec.md`) y agrega el requisito "Detección de
duplicado contra el Talent Pool" a este spec (`specs/sourcing-provider/spec.md`).

## 4. Alcance

### Dentro
- Cliente HTTP para HarvestAPI, detrás de una **interface de proveedor** (`SourcingProvider`
  o similar), siguiendo el patrón ya existente en el código para IA
  (`src/lib/ai/provider.ts` + `getAiProvider()` en `src/lib/ai/index.ts`) — hoy Serper está
  hardcodeado sin ninguna capa de abstracción.
- Reemplazo de `searchLinkedInCandidates` para que la implementación real sea HarvestAPI
  (discovery + enrich en una sola llamada).
- Ampliar el shape de resultado (`LinkedInCandidateResult`, `ScoredLinkedInCandidate`, y el
  jsonb `results` de `sourcing_search_sessions`) para cargar los campos reales: ubicación,
  experiencia, educación, idiomas, certificaciones, skills. Idiomas reusa la entidad
  "Idiomas" del candidato ya existente en WeHunter; no se estructuran endorsements.
- Persistencia de perfiles ya obtenidos a nivel organización con TTL configurable (30–60
  días) — el control de costo "no pagar dos veces" ya está definido en `limitar-sourcing-ia`
  §5; este change lo implementa contra un proveedor real.
- Hacer clickeable la card de resultado en `AiJobSourcingResults.tsx` para ver el detalle
  completo del perfil (marcado como pendiente en la investigación de `limitar-sourcing-ia`,
  se retoma acá porque depende de qué campos devuelve el proveedor elegido). Como
  `AiJobSourcingResults` es el componente compartido por **ambas entradas** al flujo de
  Sourcing IA (ver §4.1), el detalle clickeable queda disponible en las dos sin trabajo
  extra — pero el diseño técnico debe validar que entra bien en el panel lateral angosto de
  la entrada desde Postulados (`SourcingIADialog`, `side="right"`, `max-w-xl`), no solo en el
  ancho completo de la tab de Sourcing.
- Resolver con HarvestAPI las preguntas de facturación que hoy bloquean la regla
  `charge_on_provider_duplicate` del spec de créditos (ver §6.3).
- Provisioning de la cuenta/API key de HarvestAPI como integración externa nueva.
- **Eliminar Sourcing Manual**: quitar la pestaña "Sourcing Manual" de `SourcingView.tsx`
  (deja de tener sentido el selector de pestañas — un solo flujo), `LinkedInSourcingTab.tsx`,
  y las server actions `buscarLinkedinAction` / `scorearCandidatoSourcingAction`
  (`sourcing/actions.ts`).

### Fuera
- El sistema de créditos en sí (números, bloqueo, packs, visibilidad de saldo) — eso es
  `limitar-sourcing-ia`; este change solo entrega el costo real por perfil y el evento de
  consumo que ese sistema necesita.
- Cambios al scoring de Gemini (`scoreApplicationsBatch`) — sigue igual, solo recibe mejor
  información de entrada.

## 4.1 Impacto en la entrada de Sourcing desde Postulados

Hoy `AiJobSourcingResults.tsx` tiene **dos puntos de entrada**, mismo componente y misma
lógica:

- **Tab "Sourcing con IA"** (`AiSourcingTab.tsx`, dentro de `SourcingView.tsx`): el
  reclutador **elige la búsqueda** de un `<Select>` antes de ver el panel.
- **Botón dentro de Postulados** (`SourcingIADialog.tsx`, en
  `applications/ui/PostuladosTable.tsx`): ya está en el contexto de una búsqueda puntual, así
  que `jobId`/`jobTitle` se pasan directo como props — **no hay selector**, se abre
  directamente sobre esa búsqueda en un panel lateral (`Dialog side="right"`).

Como es el mismo componente, **todos los cambios de este change (HarvestAPI, campos nuevos,
detalle clickeable) aplican automáticamente a ambas entradas sin diseño duplicado.** El único
punto a verificar en diseño técnico es de layout, no de lógica: el panel lateral de
`SourcingIADialog` es más angosto (`max-w-xl`) que la tab completa de Sourcing, y el perfil
enriquecido de HarvestAPI trae más contenido (experiencia, educación) que hoy — el detalle
clickeable debe funcionar bien en ese ancho reducido, no solo en la vista de página completa.

## 5. Por qué HarvestAPI (resumen de la investigación ya hecha)

| | HarvestAPI | Coresignal | Bright Data | ScrapingDog |
|---|---|---|---|---|
| Modelo | Scraper real-time | Dataset | Scraper + dataset | Scraper real-time |
| Costo ~10 perfiles | ~USD 0,14 | ~USD 2,00 Starter | ~USD 0,50 API | ~USD 0,03–0,10 |
| Filtro de ubicación real | Sí (país/estado/ciudad) | Sí | Sí | Débil |
| Dedup nativo | Sí | N/A | No | No |
| Info del perfil | Experiencia, educación, skills, ubicación, idiomas, certificaciones | Completa | Completa | Completa |

Detalle completo y fuentes en `../limitar-sourcing-ia/research-proveedores.md`.

## 6. Preguntas abiertas

**Ninguna de producto — todas cerradas al 2026-09-14** (rondas 2 y 3, §3.1–§3.2, más la
ronda 4 de cierre de Duplicados): Serper se retira sin fallback, experiencia/educación/
idiomas/certificaciones se estructuran (endorsements fuera de alcance), Sourcing Manual
desaparece, Apify queda como default operativo sin cotizar la directa, TTL de perfiles
persistidos confirmado en 30–60 días, y la facturación de HarvestAPI se validó con una
llamada real: búsqueda (USD 0,10/página) y perfil completo (USD 0,004/perfil) son eventos
separados, y el paso barato **no** trae una URL de LinkedIn comparable contra el Talent Pool
— por eso se cerró la regla de duplicados como "siempre consume crédito, se detecta y avisa
después" (ver `specs/sourcing-provider/spec.md`, requisito "Detección de duplicado contra el
Talent Pool", y el requisito "Duplicados" ya actualizado en `limitar-sourcing-ia`).

Queda **para diseño técnico** (no bloquea, no es decisión de producto): estructura exacta de
experiencia/educación/idiomas/certificaciones en el schema Drizzle — tablas relacionales
nuevas vs. jsonb estructurado en `candidates`.

## 7. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Sin spike propio: calidad real (ubicación, duplicados, completitud) desconocida contra búsquedas de WeHunter. | Rollout gradual detrás de flag; monitorear las primeras tandas reales antes de retirar Serper. |
| Precio de HarvestAPI vía API directa no publicado — puede no coincidir con el estimado por Apify. | Cotizar antes de decidir Apify vs. directa (§6.1); el costo es configuración, no bloquea el diseño. |
| Cambiar el shape de `LinkedInCandidateResult` puede romper el jsonb ya persistido en `sourcing_search_sessions.results` de sesiones viejas. | Es una caché de trabajo que se pisa por tanda, no historial — migración no crítica; documentar en diseño técnico. |
| Acoplar el diseño a HarvestAPI sin capa de abstracción, dificultando revertir o sumar un segundo proveedor después. | Interface `SourcingProvider` desde el día 1 (ver §4), aunque la única implementación real sea HarvestAPI. |

## 8. Plan de reversión

Mantener el cliente de Serper como una segunda implementación de `SourcingProvider` (no se
borra el código), seleccionable por variable de entorno/flag. Si HarvestAPI falla o no
cumple en producción, se vuelve a Serper sin rehacer código de dominio ni de UI.

## 9. Trabajo relacionado

- `limitar-sourcing-ia` — sistema de créditos, corre en paralelo; consume el costo por perfil
  que este change determina.
- `../limitar-sourcing-ia/research-proveedores.md` — fuente de la decisión de vendor y de
  las preguntas de facturación pendientes.

---

## Próximos pasos (SDD)

1. ✅ Propuesta — este documento
2. ⏭️ Validación con el usuario (y con la clienta si corresponde el costo/plan)
3. Diseño funcional (spec) — resolver las preguntas abiertas de §6
4. Diseño técnico — interface `SourcingProvider`, cambios de schema
5. División en tareas
6. Implementación con TDD
7. Cierre
