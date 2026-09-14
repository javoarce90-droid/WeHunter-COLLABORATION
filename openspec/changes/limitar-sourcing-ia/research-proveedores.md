# Investigación — proveedores de datos de perfiles de LinkedIn

> Referencia para definir el costo real por perfil, que a su vez define los créditos y packs.
> **La selección del proveedor es un trabajo separado de este change** (spike de evaluación).
> Este change se diseña vendor-agnóstico: el costo por perfil y los créditos por plan son
> configuración, no código.

## De dónde sale la estimación de USD 0,12–0,20 por 10 candidatos

**HarvestAPI**, concretamente su actor en Apify *"LinkedIn Profile Search Scraper"*.
Modelo pay-per-event:

| Concepto | Precio |
|---|---|
| Página de búsqueda (hasta 25 perfiles) | USD 0,10 |
| Perfil completo | USD 0,004 |
| Perfil completo + búsqueda de email | USD 0,01 |

- 10 perfiles completos en una búsqueda = 0,10 + (10 × 0,004) = **USD 0,14**
- Página entera aprovechada (25) = 0,10 + 0,10 = **USD 0,20 / 25 perfiles** = USD 0,008/perfil
- HarvestAPI también ofrece un *bulk scraper* a **USD 4 / 1.000 perfiles** (0,004 c/u) o
  USD 10 / 1.000 con email.

**Costo por perfil (tarifa fija de búsqueda amortizada):**

| | Total | Por perfil |
|---|---|---|
| 10 perfiles | USD 0,14 | USD 0,014 |
| 25 perfiles (página entera) | USD 0,20 | USD 0,008 |

Fórmula: `USD 0,10 por búsqueda + USD 0,004 × perfiles`. Cuantos más perfiles por búsqueda,
más se diluye la tarifa fija de USD 0,10.

**Search-scraper vs bulk (decisión del spike):**

| Enfoque | Costo 10 perfiles | Resuelve ubicación |
|---|---|---|
| Search-scraper (1 llamada: descubre + enriquece) | ~USD 0,14 | Sí — filtros server-side reales |
| Serper/Google descubre + bulk enriquece (USD 4/1.000 = 0,004/perfil, sin tarifa de página) | ~USD 0,04 | No — sigue el filtro flojo de Google al descubrir |

El bulk es más barato por perfil pero no hace descubrimiento (necesita las URLs ya).

**Costo de plataforma — Apify (2026):** el actor corre en Apify, que es la infraestructura
(no es HarvestAPI).

| Plan Apify | Fijo/mes | Detalle | Búsquedas de 10/mes |
|---|---|---|---|
| Free | USD 0 | USD 5 de uso, no se acumula, concurrencia limitada | ~35 |
| Starter | USD 29 | El fee **es** el presupuesto de uso; overage a fin de mes | ~200 |
| Scale | USD 199 | — | ~muchas |

En planes pagos el fee = crédito de uso (no es fee + uso por separado hasta ese monto).

**Alternativas para bajar el costo fijo:**
1. Arrancar en el free tier de Apify (USD 0), migrar cuando el volumen lo justifique.
2. API directa de HarvestAPI (`api.harvest-api.com`, sin Apify) — evita el markup de
   plataforma; precio a cotizar con ellos (Discord / sales), no está publicado.
3. Serper (ya se paga) + bulk de HarvestAPI solo para enriquecer.

## Por qué Coresignal da mucho más caro

Son **modelos distintos**:

- **Coresignal = proveedor de datasets.** Vende acceso a una base pre-compilada. Precio por
  crédito con "credit cliff": 1 registro de persona = 10 créditos.
  - Plan Starter (USD 49/mes): **~USD 0,196 por registro**
  - Baja a ~USD 0,03 recién en Premium (USD 1.500/mes)
  - Búsqueda de contactos y search preview: desde el plan Pro (USD 499/mes)
  - Para una agencia chica en Starter: **10 perfiles ≈ USD 2,00** (≈14× HarvestAPI)
  - Datos pueden tener meses de desactualización entre refrescos
- **HarvestAPI = scraper en tiempo real.** Busca y trae el perfil en vivo, sin cuenta de
  LinkedIn, pago por uso sin mínimos grandes.

## Comparación (para validar: costo, calidad, ubicación, duplicados, info del perfil)

| | HarvestAPI | Coresignal | Bright Data | ScrapingDog |
|---|---|---|---|---|
| Modelo | Scraper real-time | Dataset | Scraper + dataset | Scraper real-time |
| Costo ~10 perfiles | ~USD 0,14 | ~USD 2,00 Starter / ~USD 0,30 Premium | ~USD 0,50 API / ~USD 0,03 dataset | ~USD 0,03–0,10 |
| Búsqueda con filtros (no solo por URL) | Sí | Sí | Sí | Limitada |
| Filtro de ubicación | País/estado/ciudad, actual y pasada | Sí | Sí | Débil |
| Frescura | En vivo | Meses | En vivo (API) | En vivo |
| Info del perfil | Experiencia, educación, skills, ubicación, idiomas, certificaciones, endorsements | Completa | Completa | Completa |
| Dedup nativo | Sí (registro de IDs ya traídos) | N/A | No | No |
| Mínimo mensual | Apify free / ~USD 39 | USD 49 (útil desde USD 499) | Pago por uso | ~USD 40 |
| Riesgo legal | Lo asume el scraper; sin cuenta de LinkedIn | Menor (dataset), pero LinkedIn también lo demandó históricamente | Mejor postura declarada del mercado | Lo asume el scraper |

## Recomendación de spike (separado de este diseño)

Antes de cerrar créditos y packs, evaluar **2 proveedores** (HarvestAPI + uno más — Coresignal
o Bright Data) con **búsquedas reales de WeHunter**, midiendo:

1. **Costo por perfil útil** (no por perfil crudo — descontando duplicados y basura).
2. **Precisión del filtro de ubicación** contra la ubicación real del perfil de LinkedIn
   (la queja original de la clienta).
3. **Tasa de duplicados** dentro de una tanda y entre tandas.
4. **Completitud de campos** (¿viene experiencia/educación/skills o llegan vacíos?).

Salida del spike: el "costo real por perfil útil" → entra como configuración de este sistema.
Esfuerzo estimado: 1–2 días.

## Preguntas de facturación a validar (agregadas por la clienta, 2026-09-11)

Bloquean cerrar la regla de duplicados del spec funcional (`charge_on_provider_duplicate`).
Hay que confirmarlas con HarvestAPI (y con el segundo proveedor que se pruebe) antes de
cerrar esa regla:

1. ¿Cobra por búsqueda, por resultado, o al recuperar el perfil completo?
2. ¿Search y Profile Retrieval son eventos de cobro **separados**?
3. ¿Se puede obtener la URL/ID de LinkedIn **antes** de pagar el perfil completo?
4. ¿Se puede comparar contra el Talent Pool **antes** de generar el costo?
5. Si devuelve un candidato que ya existe en el Talent Pool, ¿se cobra igual?
6. ¿Qué pasa cuando entrega **menos** perfiles que los solicitados? (ya cubierto en el spec:
   se cobra por lo entregado, no por lo pedido — pero falta confirmar que el proveedor
   factura igual, por si su cobro no coincide con "perfiles entregados").

Regla técnica deseada (WeHunter): antes de una consulta paga → verificar candidato
existente → reutilizar si corresponde → consultar al proveedor solo cuando hace falta.
Si el proveedor cobra antes de que WeHunter pueda filtrar el duplicado, queda pendiente
decidir si ese costo lo absorbe WeHunter o consume crédito del cliente — ver el requisito
"Duplicados" del spec funcional.

## Nota de UX para cuando arranque la integración del proveedor (2026-09-11)

Comentario del usuario sobre el prototipo de créditos: una vez que el perfil venga
completo (experiencia, educación, certificaciones), **la tarjeta de resultado de Sourcing
debería mostrar más que hoy y poder abrirse para ver el detalle completo** — hoy
(`AiJobSourcingResults.tsx`) muestra headline + skills + resumen de match, sin detalle
clickeable. Correcto, pero es una decisión de UI de **esa** iniciativa (depende de qué
campos devuelva el proveedor elegido), no de `limitar-sourcing-ia` — quedó marcada como tal
en el prototipo de créditos para no mezclar alcance. Retomar acá cuando se arranque el
spike/diseño del proveedor.

## Fuentes

- HarvestAPI Apify actor: https://apify.com/harvestapi/linkedin-profile-search
- HarvestAPI docs: https://docs.harvestapi.io/guides/profile-search
- Coresignal pricing: https://coresignal.com/pricing/ · https://apiserpent.com/blog/coresignal-pricing-explained
- Comparativas 2026: https://www.socialcrawl.dev/blog/best-linkedin-data-apis-2026 · https://apiserpent.com/blog/best-linkedin-data-apis-2026
- Proxycurl (cerrado 2026-07-04 tras demanda de LinkedIn): https://linkedapi.io/guides/proxycurl-alternatives
