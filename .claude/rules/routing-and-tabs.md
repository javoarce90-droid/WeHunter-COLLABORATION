# Regla: rutas, subtabs y carga progresiva de datos

Patrón para cualquier vista que tenga subtabs o secciones (pipeline, perfil, configuración,
detalle de algo con pestañas, etc.). El objetivo: que cada vista cargue **solo lo que se ve**,
no todo por adelantado.

## Principio
Una pantalla NO debe cargar los datos de todas sus subtabs al abrirse. Solo carga lo de la
tab activa. Lo de las demás se pide recién cuando el usuario entra a esa tab.

> Síntoma del antipatrón: al abrir una pantalla con N tabs, el Server-Timing muestra las
> queries de las N tabs juntas. Si ves eso, esta regla no se está aplicando.

## Cómo se hace (App Router)
**Cada subtab es su propio segmento de ruta**, no una tab manejada en el cliente.

```
app/<vista>/
  layout.tsx        # lo COMÚN a todas las tabs (header, título, datos del recurso padre).
                    # Se carga UNA vez y no se repite al cambiar de tab.
  page.tsx          # redirige o muestra la tab por defecto
  <tab-a>/page.tsx  # carga SOLO los datos de la tab A
  <tab-b>/page.tsx  # carga SOLO los datos de la tab B
  <tab-c>/page.tsx  # carga SOLO los datos de la tab C
```

- El **layout** trae lo compartido (ej. el nombre del recurso, el header) una sola vez.
- Cada **page de tab** trae únicamente sus datos, en el server.
- El cambio de tab es una **navegación** (links a cada segmento), no estado de cliente.

## Prefetch y cache (gratis, lo da Next)
- Los `<Link>` a cada tab se **prefetchean** automáticamente cuando están en viewport.
- Al volver a una tab ya visitada, Next la sirve desde el **Router Cache** del cliente: sin
  nueva petición, instantáneo.
- Por eso NO desactivamos el prefetch: con las rutas baratas (cada una pide poco), el prefetch
  juega a favor. La forma de abaratar es esta regla, no apagar el prefetch.

## Antipatrón a evitar
NO hagas una sola página con las tabs en el cliente (`"use client"`) y un `useEffect` que pide
datos al cambiar de tab. Eso pierde el render en server, mete estados de carga manuales y
vuelve al fetching en el cliente. Tabs = segmentos de ruta, siempre.

## Dentro de cada tab (combinar con frontend-performance y database.md)
- Fusioná las queries del mismo dominio en una (ej. lista + sus counts → una query).
- Paralelizá las queries independientes con `Promise.all` (no en serie).
- Envolvé en `<Suspense>` lo que igual tarde, para no bloquear el render de esa tab.
- Verificá el Server-Timing de la tab: si hay etiquetas repetidas o muchas transacciones en
  serie, todavía hay trabajo.

## Checklist
- [ ] Cada subtab es un segmento de ruta, no una tab de cliente.
- [ ] Lo compartido está en el `layout`, cargado una vez.
- [ ] Cada tab pide SOLO sus datos.
- [ ] La tab por defecto es la más liviana / la que el usuario ve primero.
- [ ] Dentro de la tab: queries del mismo dominio fusionadas, independientes en paralelo.
- [ ] No desactivé el prefetch; las rutas son baratas.
