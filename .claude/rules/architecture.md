# Regla: Arquitectura

## Principio central
La **lógica de negocio** está separada de la **interfaz**. Si mañana cambiamos toda la UI,
las reglas del negocio no se tocan. Esto es lo que hace al producto mantenible y testeable.

## Las 3 capas de una feature
Cada feature (`src/features/<feature>/`) tiene tres capas, y el flujo va siempre hacia adentro:

```
UI  →  actions.ts  →  domain/ (casos de uso)  →  data/ (Drizzle)  →  base
```

### 1. `domain/` — casos de uso (el corazón)
- Funciones que representan una operación del negocio: `crearBusqueda`, `postularCandidato`,
  `moverEtapa`, `compartirShortlist`.
- Reciben datos ya validados y el contexto del usuario (quién es, de qué org).
- Contienen las **reglas de negocio**: qué se puede hacer, con qué permisos, bajo qué condiciones.
- **No conocen Next.js, ni HTTP, ni React.** Esto las hace testeables sin levantar la app.
- Hacen la **autorización primaria**: chequean rol y pertenencia a la org ANTES de actuar.

### 2. `data/` — acceso a datos
- Queries y mutations con Drizzle. Nada de reglas de negocio acá, solo leer/escribir.
- Reciben siempre el cliente RLS (ver `database.md`), nunca el admin.

### 3. `actions.ts` — puerta de entrada (server actions)
- Es el único punto que la UI llama. Su trabajo:
  1. Validar el input con Zod.
  2. Obtener el usuario actual (sesión Supabase).
  3. Llamar al caso de uso de `domain/`.
  4. Devolver resultado o error.
- **No tiene lógica de negocio.** Es un traductor entre la UI y el dominio.

### UI (`ui/` y `app/`)
- Componentes y rutas. Renderizan y llaman a las actions. Punto.
- Cero lógica de negocio. Cero queries directas a la base.

## Por qué así (atributos de calidad)
- **Mantenibilidad:** cada cosa tiene un solo lugar. Un bug de negocio se arregla en `domain/`,
  no buscando en 10 componentes.
- **Testeabilidad:** los casos de uso se testean solos, sin UI ni base real.
- **UI reemplazable:** cambiar la interfaz no rompe el negocio (objetivo explícito del proyecto).
- **Performance:** las queries viven en `data/`, fáciles de optimizar/cachear sin tocar lógica.
- **Seguridad:** la autorización está en `domain/` (un solo lugar) + RLS de respaldo.

## Lo que NO hacemos (todavía)
- No armamos hexagonal formal con puertos y adaptadores. La separación en 3 capas ya nos da
  el beneficio sin la ceremonia. Si en el futuro necesitamos cambiar de ORM o de proveedor,
  ahí evaluamos abstraer. **No sobre-ingenierizar.**
- No microservicios. Es un monolito modular y está bien.
