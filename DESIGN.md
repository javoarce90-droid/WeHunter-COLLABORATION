# Design

## Color

### Palette

| Token | Valor | Uso |
|---|---|---|
| `--primary` | `#7B2FDB` | Acción principal, foco, links activos |
| `--primary-hover` | `#6626B8` | Hover de botones y elementos primarios |
| `--primary-light` | `#F3EDFC` | Fondos suaves purple, badges, chips |
| `--sidebar` | `#1C1533` | Sidebar dark navy |
| `--sidebar-mid` | `#251B42` | Secciones internas del sidebar |
| `--sidebar-alt` | `#2A2147` | Items activos del sidebar |
| `--surface` | `#FFFFFF` | Cards, modales, áreas de contenido |
| `--bg` | `#F7F8FA` | Fondo general de la app |
| `--border` | `#E5E7EB` | Bordes de cards, inputs, separadores |
| `--text` | `#0F0A1A` | Texto principal |
| `--muted` | `#6B6578` | Labels, metadata, texto secundario |
| `--ai` | `#9D6DF1` | Elementos de IA, gradientes purple claro |
| `--success` | `#059669` | Estados positivos, hired, confirmaciones |
| `--warning` | `#EA580C` | Alertas, offer stage, urgente |
| `--danger` | `#DC2626` | Errores, rejected, acciones destructivas |

### Semántica de stages del pipeline

| Stage | Color fondo | Color texto |
|---|---|---|
| `new` | `#F3F4F6` | `#374151` |
| `screening` | `#DBEAFE` | `#1E40AF` |
| `interview` | `#FEF3C7` | `#92400E` |
| `offer` | `#F3EDFC` | `#6626B8` |
| `hired` | `#D1FAE5` | `#065F46` |
| `rejected` | `#FEE2E2` | `#991B1B` |

## Typography

| Variable | Fuente | Uso |
|---|---|---|
| `--font-sans` / `--font-inter` | Inter | Body, UI, labels, inputs |
| `--font-display` / `--font-plus-jakarta` | Plus Jakarta Sans | Headings, page titles, logo |

- **Body base**: 14px / line-height 1.5 / Inter
- **Headings**: Plus Jakarta Sans, bold, letter-spacing negativo (`-0.3px` a `-0.4px`)
- **Labels/metadata**: 11–12px, font-weight 500–600, color `--muted`
- **Logo "We"**: Georgia italic, color `#C4B5FD`

### Escala de tamaños típicos

| Contexto | Size | Weight |
|---|---|---|
| Page title | 22–26px | 700 |
| Section heading | 16–18px | 700 |
| Card title | 14–15px | 700 |
| Body / default | 13–14px | 400–500 |
| Label / caption | 11–12px | 500–600 |

## Spacing & Layout

- **Border radius**: `10px` (`--radius`) en cards, inputs, botones. `8px` en elementos secundarios. `999px` en badges pill y chips.
- **Shadow**: `0 1px 3px rgba(0,0,0,.08), 0 4px 12px rgba(0,0,0,.04)`
- **Sidebar width**: `260px`
- **Topbar height**: `60px`
- **Card padding**: `20px` (default) / `18px` (compacto)
- **Content padding**: `24px`

## Components

### Button

Variantes: `primary` · `secondary` · `ghost` · `destructive` · `sm`

```tsx
<Button variant="primary">Guardar</Button>
<Button variant="secondary">Cancelar</Button>
<Button variant="ghost" size="sm">Ver más</Button>
```

- Primary: `bg-primary text-white hover:bg-primary-hover`, `rounded-[var(--radius)]`, `px-4 py-2.5 text-sm font-semibold`
- Secondary: `border border-border bg-surface text-text hover:bg-bg`
- Ghost: `bg-transparent text-muted border border-border hover:bg-bg`
- Sm: `px-2.5 py-1.5 text-xs`

### Badge

Variantes de color (`success`, `warning`, `danger`, `primary`, `muted`, `blue`) y de stage del pipeline (`new`, `screening`, `interview`, `offer`, `hired`, `rejected`).

```tsx
<Badge variant="hired">Contratado</Badge>
<Badge variant="screening">En revisión</Badge>
```

Forma: `rounded-full`, `text-[11px] font-semibold`, `px-2 py-0.5`

### Input

Con label y estado de error. Focus ring: `2px rgba(123,47,219,0.2)`.

```tsx
<Input label="Email" error="Campo requerido" />
```

### Card

```tsx
<Card>...</Card>
<Card variant="kpi">...</Card>  {/* hover con border purple */}
<CardHeader /><CardContent /><CardFooter />
```

## Motion

- Transiciones: `150ms ease` en colores, borders, box-shadow
- Hover en cards: `translateY(-3px)` con shadow aumentado (search cards)
- Animación de vista: `opacity 0→1 + translateY(8px→0)` en `250ms`
- Principio: **velocidad percibida**. Corto y funcional, nunca decorativo.

## Patterns

- **Sidebar dark** con ítems activos en `rgba(primary-rgb, 0.22)` — nunca un fondo sólido
- **Topbar blanca** con shadow sutil sobre el contenido
- **Empty states**: border dashed `primary/25`, fondo `--bg`, ícono en círculo `primary-light`
- **Kanban**: columnas en `--bg`, cards blancas con hover shadow
- **KPI cards**: accent line de 3-4px en el top con gradiente del color semántico
- **AI elements**: gradiente `primary → ai (#9D6DF1)`, badge "AI" cuadrado `bg-primary text-white`
