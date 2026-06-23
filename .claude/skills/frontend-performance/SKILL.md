---
name: frontend-performance
description: Usar SIEMPRE al construir o modificar UI/front en WeHunter — páginas, componentes, layouts, listados, dashboards, formularios. Asegura que el front nazca rápido y evita los problemas típicos (render bloqueado por queries lentas, bundles inflados, imágenes sin optimizar, componentes cliente innecesarios, round-trips duplicados). Disparar ante pedidos como "armá el dashboard", "creá la pantalla de listado de candidatos", "hacé el formulario de postulación".
---

# Skill: performance de front

Aplicá estos patrones al escribir UI. El objetivo es que la página cargue rápido y no se
bloquee esperando datos. (Contexto: la demo previa era lenta porque el render esperaba queries
lentas, pedía la misma data dos veces, y el stream quedaba abierto — eso es lo que evitamos.)

## 1. No bloquees el render con datos lentos
- En un Server Component, NO hagas que toda la página espere la query más lenta. Envolvé la
  parte que depende de datos lentos en `<Suspense>` con un fallback, así el resto de la página
  se muestra de inmediato y lo lento llega después (streaming intencional, no accidental).
- Traé datos en **paralelo**, no en cascada. Si una página necesita 3 queries independientes,
  lanzalas juntas (`Promise.all`), no una atrás de otra.
- Si un dato es pesado y no es crítico para la primera vista, cargalo después / on-demand.

## 2. Las queries son el cuello, no el framework
- Toda query que filtra por una columna (ej. `organization_id`, `job_id`) necesita índice.
- Evitá N+1: no hagas una query por cada item de una lista. Traé todo en una con join/`in`.
- Listados SIEMPRE con `limit` y paginación. Nunca traigas "todo".
- Counts/KPIs: una sola query con varios `count(...)`, no una transacción por cada número.
- Deduplicá: auth, sesión y membership van con `cache()` (una vez por request). Ver database.md.
- Las queries viven en la capa `data/` de la feature (ver architecture.md). Optimizá ahí.

## 3. Cliente vs. servidor
- Por defecto, los componentes son Server Components. Poné `"use client"` SOLO en lo que
  necesita interactividad (estado, eventos, hooks). Cuanto menos cliente, menos JS al navegador.
- Mantené los componentes cliente chicos y en las hojas del árbol, no arriba envolviendo todo.

## 4. Bundle e imágenes
- Usá `next/image` para imágenes (optimización y lazy-load automáticos). Nunca `<img>` pelado.
- No importes librerías pesadas en el cliente. Si una lib grande se usa en un solo lugar,
  cargala con `dynamic(() => import(...))` para que no infle el bundle inicial.
- Antes de sumar una dependencia nueva al front, verificá su tamaño y si de verdad hace falta.
- Importá solo lo que usás (ej. `import { x } from 'lib'`, no `import * as lib`).

## 5. Checklist antes de terminar una pantalla
- [ ] Lo lento está en `<Suspense>`, no bloquea toda la página.
- [ ] Las queries independientes van en paralelo.
- [ ] Las columnas que se filtran tienen índice; los listados tienen `limit`.
- [ ] Nada se pide dos veces por request (auth/membership con `cache()`).
- [ ] `"use client"` solo donde hace falta interactividad.
- [ ] Imágenes con `next/image`.
- [ ] No metí ninguna librería pesada en el cliente sin `dynamic`.

## 6. Verificá el Server-Timing antes de dar por terminada la pantalla
- Corré la pantalla en dev y mirá la terminal: cada query aparece con su tiempo (`measure()`).
- **Si una etiqueta aparece dos veces en un solo load, hay un round-trip duplicado** -> arreglalo
  con `cache()`. Este chequeo es parte del merge gate: no abras PR de una pantalla con queries
  duplicadas o sin `limit`.

## Medir, no adivinar
Para velocidad real: `pnpm build && pnpm start` y navegá (no `pnpm dev`, que compila on-demand
y miente sobre los tiempos). Si una pantalla se siente lenta, mirá el desglose del Server-Timing
(`src/lib/server-timing.ts`) para saber qué parte tarda — query, auth, etc. — en vez de adivinar.
Lighthouse corre en CI en cada PR; si el score de performance baja del umbral, el merge se bloquea.
