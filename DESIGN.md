---
name: WeHunter
description: ATS SaaS multi-tenant para reclutadores y consultoras de RRHH
colors:
  primary: "#7B2FDB"
  primary-hover: "#6626B8"
  primary-light: "#F3EDFC"
  ai: "#9D6DF1"
  sidebar: "#1C1533"
  sidebar-mid: "#251B42"
  sidebar-alt: "#2A2147"
  surface: "#FFFFFF"
  bg: "#F7F8FA"
  border: "#E5E7EB"
  text: "#0F0A1A"
  muted: "#6B6578"
  label: "#5C5568"
  success: "#059669"
  warning: "#EA580C"
  danger: "#DC2626"
typography:
  display:
    fontFamily: "Plus Jakarta Sans, sans-serif"
    fontWeight: 700
    letterSpacing: "-0.3px"
  body:
    fontFamily: "Inter, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Inter, sans-serif"
    fontSize: "12px"
    fontWeight: 600
rounded:
  default: "10px"
  pill: "999px"
spacing:
  sidebar-w: "260px"
  topbar-h: "60px"
  card-padding: "20px"
  content-padding: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#FFFFFF"
    typography: "{typography.body}"
    rounded: "{rounded.default}"
    padding: "12px 16px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.default}"
    padding: "12px 16px"
  badge-pill:
    rounded: "{rounded.pill}"
    padding: "4px 8px"
---

# Design System: WeHunter

## Overview

**Creative North Star: "El Atajo Elegante"**

WeHunter no asume que quien recluta ya sabe qué hacer en cada pantalla: la acompaña con
claridad hacia la próxima acción. Cada superficie es el camino más corto a una decisión —
sin fricción visual, sin pasos de más, sin pedir confirmaciones para lo que se puede
deshacer. Cuando la IA puede decidir por vos, lo hace; cuando no, te da exactamente lo que
necesitás para decidir vos, sin rodeos.

El sistema es elegante y contenido, nunca ruidoso. Interacciones suaves y veloces (120–250ms,
easings exponenciales que desaceleran al entrar), consistentes pantalla tras pantalla, para
que la carga cognitiva quede en el trabajo del reclutador — evaluar candidatos, mover
etapas — y no en aprender la interfaz de nuevo cada vez.

Rechazos visuales confirmados: nada de grillas recargadas, formularios de 20 campos ni
jerarquías de menú de un ERP enterprise (Workday/SAP). Tampoco un tablero Kanban genérico
tipo Trello — el Kanban es una vista dentro del sistema, nunca la identidad del producto.

**Key Characteristics:**
- Densidad útil: más información relevante en menos espacio; se escanea, no se lee.
- Velocidad percibida: feedback inmediato, transiciones cortas y funcionales, nunca decorativas.
- IA en contexto: las sugerencias aparecen donde pasa el trabajo, no en un panel aparte.
- Refinado y contenido: superficies suaves, poco contraste entre estados, la interfaz no compite con el contenido.
- Consistencia antes que novedad: un patrón aprendido una vez funciona igual en toda la app.

## Colors

Paleta acotada y de alto contraste funcional: un único acento violeta para acción, un
segundo acento más claro reservado a IA, y una escala neutra amplia que sostiene la
densidad de información sin fatigar.

### Primary
- **Púrpura Eléctrico** (`#7B2FDB`): acción principal, foco, links activos, CTA primarios.
- **Púrpura Eléctrico — hover** (`#6626B8`): hover de botones y elementos primarios.
- **Púrpura Eléctrico — fondo suave** (`#F3EDFC`): fondos suaves, badges, chips, estado "offer" del pipeline.

### Secondary
- **Lavanda IA** (`#9D6DF1`): elementos de IA, gradientes `primary → ai`, badge cuadrado "AI".

### Neutral
- **Navy Profundo** (`#1C1533`): sidebar, superficie oscura estructural.
- **Navy Medio** (`#251B42`): secciones internas del sidebar.
- **Navy Activo** (`#2A2147`): ítems activos del sidebar.
- **Blanco Superficie** (`#FFFFFF`): cards, modales, áreas de contenido.
- **Gris Fondo** (`#F7F8FA`): fondo general de la app.
- **Gris Borde** (`#E5E7EB`): bordes de cards, inputs, separadores.
- **Negro Texto** (`#0F0A1A`): texto principal.
- **Gris Muted** (`#6B6578`): labels, metadata, texto secundario.
- **Gris Label** (`#5C5568`): labels de campos de formulario.

### Estados semánticos
- **Verde Confirmado** (`#059669`): estados positivos, hired, confirmaciones.
- **Naranja Alerta** (`#EA580C`): alertas, offer stage, urgente.
- **Rojo Crítico** (`#DC2626`): errores, rejected, acciones destructivas.

### Semántica de stages del pipeline

| Stage             | Color fondo | Color texto |
| ------------------ | ----------- | ----------- |
| `new`               | `#F3F4F6`   | `#374151`   |
| `screening`         | `#DBEAFE`   | `#1E40AF`   |
| `interview`         | `#FEF3C7`   | `#92400E`   |
| `interview_hr`      | `#FEF3C7`   | `#92400E`   |
| `interview_tech`    | `#FDE68A`   | `#78350F`   |
| `interview_client`  | `#EDE9FE`   | `#5B21B6`   |
| `offer`             | `#F3EDFC`   | `#6626B8`   |
| `hired`             | `#D1FAE5`   | `#065F46`   |
| `rejected`          | `#FEE2E2`   | `#991B1B`   |

### Named Rules
**The Acento Único Rule.** El violeta primario se reserva para acción y foco. Como fondo
grande solo aparece en su variante clara (`--primary-light`), nunca sólido salvo en botones
y estados activos puntuales — su escasez es lo que lo hace legible como "esto es accionable".

## Typography

**Display Font:** Plus Jakarta Sans (with sans-serif)
**Body Font:** Inter (with sans-serif)

Plus Jakarta Sans para headings y títulos de página; Inter para texto de cuerpo, UI, labels e inputs.

**Character:** un pareo funcional, no expresivo: Plus Jakarta Sans le da peso e intención a
los títulos (bold, tracking negativo) sin volverse decorativa; Inter sostiene la densidad de
cuerpo con máxima legibilidad a tamaños chicos (11–14px), coherente con "densidad útil".

> El isotipo "WeHunter" ya no es texto tipografiado (Georgia itálica) sino un asset de imagen
> (`public/n/wehunter-mark*.png`) vía el componente `Wehuntern` — no forma parte de la escala
> tipográfica.

### Hierarchy
- **Page title** (700, 22–26px): título de página, máximo nivel de jerarquía.
- **Section heading** (700, 16–18px): encabezados de sección dentro de una pantalla.
- **Card title** (700, 14–15px): título de una card individual.
- **Body / default** (400–500, 13–14px): texto de cuerpo y UI general.
- **Label / caption** (500–600, 11–12px, color `--muted` o `--label`): metadata, labels de campo.

### Named Rules
**The Negative Tracking Rule.** Todo heading en Plus Jakarta Sans lleva letter-spacing
negativo (`-0.3px` a `-0.4px`) — sin esto el peso bold se siente suelto, no compacto.

## Layout

Grid implícito vía flex/grid de Tailwind, sin sistema de columnas rígido: sidebar fija
(`260px`) + topbar fija (`60px`) + contenido con padding `24px`. Cada subtab de una pantalla
con secciones es su propio segmento de ruta (Next.js App Router) que carga solo sus datos —
la navegación entre tabs no recarga lo compartido del layout padre.

**Escala de spacing:** solo pasos ENTEROS de Tailwind (múltiplos de 4px: `1`=4px, `2`=8px,
`3`=12px, `4`=16px, `5`=20px, `6`=24px…). Nada de medios pasos (`py-2.5`, `gap-1.5`,
`px-3.5`, `mb-0.5`) — rompen el ritmo y quedan apretados. Al tocar un componente que todavía
tenga un medio paso, redondear hacia arriba al entero siguiente (más aire, nunca menos).

- **Card padding:** `20px` (default) / `18px` (compacto).
- **Content padding:** `24px`.

### Named Rules
**The Integer Steps Rule.** Ver arriba — es la regla de spacing más repetida del proyecto.

## Elevation & Depth

Las sombras son **estructurales**, no ambientales: comunican jerarquía real de capas
(qué superficie está por encima de cuál), no un efecto atmosférico suelto. El sistema es
mayormente plano en reposo; la sombra aparece para marcar una superficie elevada (card,
overlay) o como respuesta a un estado (hover).

### Shadow Vocabulary
- **Superficie** (`box-shadow: 0 1px 3px rgba(0,0,0,.08), 0 4px 12px rgba(0,0,0,.04)`): sombra default de cards, inputs, botones — separación sutil del fondo.
- **Overlay** (`box-shadow: 0 10px 30px rgba(15,10,26,.12), 0 4px 10px rgba(15,10,26,.08)`): popovers, sheets, dialogs — mayor difusión, mayor jerarquía.

### Named Rules
**The Response-Not-Decoration Rule.** Las cards KPI son planas en reposo; la sombra crece
solo en `hover` junto con `translateY(-3px)` — la elevación es feedback de interacción, no
un adorno permanente.

## Shapes

Esquinas redondeadas consistentes, nunca esquinas vivas salvo excepción puntual (ver
Do's/Don'ts). Un único radio base gobierna la mayoría de superficies; el pill solo aparece
en elementos de estado (badges, chips).

- **Radio base:** `10px` (`--radius`) — cards, inputs, botones.
- **Radio secundario:** `8px` — elementos secundarios/anidados.
- **Pill:** `999px` — badges y chips de estado.

## Components

### Buttons
- **Shape:** `rounded-[var(--radius)]` (10px).
- **Primary:** `bg-primary text-white hover:bg-primary-hover`, `px-4 py-3` (16px/12px), `text-sm font-semibold`.
- **Secondary:** `border border-border bg-surface text-text hover:bg-bg`.
- **Ghost:** `bg-transparent text-muted border border-border hover:bg-bg hover:text-text`.
- **Destructive:** `bg-danger text-white hover:opacity-90`, focus ring `--focus-ring-danger`.
- **Sm:** `px-3 py-2 text-xs`.
- **Estados (todas las variantes):** `focus-visible` ring `--focus-ring` · `active:scale-[0.98]` (feedback táctil) · `disabled:opacity-50` · `loading` (prop) bloquea el botón y muestra `Spinner` inline preservando el ancho.
- **`SubmitButton`:** variante para forms con server action — deriva `loading` de `useFormStatus` en vez de estado manual.

### Badges
- **Shape:** `rounded-full`, `px-2 py-1`, `text-[11px] font-semibold`.
- **Variantes de color:** `success` · `warning` · `danger` · `primary` · `muted` · `blue`.
- **Variantes de stage:** una por cada valor de `Application["stage"]` (ver tabla de Colors).

### Cards / Containers
- **Corner Style:** `10px` (`rounded-[var(--radius)]`); variante `kpi` usa `rounded-xl`.
- **Background:** `--surface` (blanco) sobre `--bg` (gris claro).
- **Shadow Strategy:** sombra "Superficie" en reposo; variante `kpi` sube a `shadow-md` + `border-primary/35` en hover.
- **Internal Padding:** `20px` (`CardHeader`/`CardContent`/`CardFooter`, vía `p-5`), con borde superior/inferior en header/footer.

### Inputs / Fields
- **Style:** fondo `--bg` (contrasta con la card `--surface`), borde `--border`, `rounded-[var(--radius)]`, `px-3 py-3`.
- **Focus:** `focus:border-primary` + `ring-2 ring-[var(--focus-ring)]`.
- **Error:** borde y ring pasan a `--danger` / `--focus-ring-danger`; mensaje de error reemplaza el `helperText` (nunca los dos juntos).
- **Disabled:** `opacity-50`, `cursor-not-allowed`.

### Loading & Feedback
- **`Spinner`:** anillo `border-2 border-current border-r-transparent`, `animate-spin` — reservado a acciones puntuales (dentro de un botón).
- **`Skeleton`:** para carga de contenido (nunca `Spinner` para eso).
- **Toast:** feedback persistente cuando el resultado de una operación larga debe sobrevivir al cierre de su modal/sheet.

### Navigation (Sidebar / Topbar)
- **Sidebar:** dark (`--sidebar`), ancho fijo `260px`; ítems activos en `rgba(primary-rgb, 0.22)` — **nunca** un fondo sólido.
- **Topbar:** blanca, alto fijo `60px`, sombra sutil ("Superficie") sobre el contenido.

### Operación de IA larga (patrón de contenedor)
Dos tratamientos según si la operación se puede interrumpir:
- **Interrumpible** (ej. Sourcing con IA): **sheet lateral** dismissable; al cerrar sigue
  corriendo en el server y avisa por la campanita. Conserva el contexto.
- **No interrumpible** porque escribe registros (ej. alta de candidatos por lote de CVs):
  **modal centrado** con `blurBackdrop` + `dismissable={false}`, barra de progreso
  determinada y resultado por ítem. Sale solo por botón explícito; al terminar dispara un
  toast persistente.

### Empty States
Border dashed `primary/25`, fondo `--bg`, ícono en círculo `--primary-light`.

### Kanban
Columnas en `--bg`, cards blancas con hover shadow — una vista dentro del sistema, no la
identidad del producto (ver Overview, anti-referencia Trello).

## Do's and Don'ts

### Do:
- **Do** usar solo pasos enteros de la escala de spacing (múltiplos de 4px).
- **Do** reservar el violeta primario a acción/foco; como fondo grande, solo su variante clara.
- **Do** usar `Skeleton` para carga de contenido y `Spinner` solo para acciones puntuales.
- **Do** transiciones cortas (120–250ms) con easing exponencial de salida — velocidad percibida ante todo.
- **Do** mantener cada subtab de una pantalla con secciones como su propio segmento de ruta, cargando solo sus datos.

### Don't:
- **Don't** usar medios pasos de spacing (`py-2.5`, `gap-1.5`, `px-3.5`).
- **Don't** pedir confirmación (modal) para una acción recuperable/deshacible.
- **Don't** usar un fondo sólido en los ítems activos del sidebar — siempre `rgba(primary-rgb, 0.22)`.
- **Don't** dejar una operación de IA que escribe registros sin bloquear la UI y mostrar progreso determinado por ítem.
- **Don't** tratar el Kanban como la identidad visual del producto — es una vista más.
