# Módulo de Búsqueda de Candidatos en LinkedIn (LinkedIn Sourcing)

Este módulo permite a los reclutadores buscar candidatos directamente en **LinkedIn** mediante queries optimizadas de tipo **X-Ray Search** (`site:linkedin.com/in/`), visualizar perfiles con enlace directo a LinkedIn y guardarlos en el Pool de Talento de WeHunter (`/candidates`).

---

## 📌 Aspectos Funcionales

1. **Buscador Unificado de Texto Libre**: El reclutador ingresa términos de búsqueda como *"backend engineer supabase python"*. El sistema formatea automáticamente la query booleana X-Ray.
2. **Resultados con Enlaces Directos**: Cada tarjeta de candidato muestra:
   - Nombre completo, titular/puesto y ubicación.
   - Extracto/resumen relevante.
   - Chips de habilidades/tecnologías extraídas.
   - **"Ver perfil"**: Enlace directo que abre el perfil oficial del candidato en LinkedIn en una pestaña nueva del navegador (`target="_blank" rel="noopener noreferrer"`).
3. **Importación al Pool de WeHunter**:
   - Al presionar **"Importar a WeHunter"**, el candidato se inserta en la base de datos de la organización (`candidates`), guardando su `full_name`, `headline`, `location`, `skills`, `linkedin_url` y `source = 'linkedin'`.
   - El estado del candidato cambia a **`En el pool ✓`** y queda disponible inmediatamente en la vista general de Candidatos (`/candidates`).

---

## 🏗️ Arquitectura Técnica y Capas (3-Tier Layering)

El módulo respeta estrictamente la arquitectura por capas del proyecto (Domain ➔ Actions ➔ UI):

```
src/app/(app)/sourcing/page.tsx
       │
       ▼
src/features/recruiter/sourcing/ui/LinkedInSourcingTab.tsx (Client Component)
       │
       ▼
src/features/recruiter/sourcing/actions.ts (Server Actions con Zod)
       │
       ▼
src/features/recruiter/sourcing/domain/linkedin-search.ts (Lógica de Dominio Pura)
       │
       ▼
src/features/recruiter/candidates/data/candidates.mutations.ts (Drizzle ORM ➔ PostgreSQL)
```

### 1. Dominio (`src/features/recruiter/sourcing/domain/`)
- **`linkedin-search.ts`**:
  - `LinkedInCandidateResult`: Tipo que extiende `SourcingResult` agregando `linkedinUrl` y `snippet`.
  - `buildLinkedInXRayQuery(freeText)`: Función pura que formatea la entrada libre a la sintaxis X-Ray de Google (`site:linkedin.com/in/ ...`).
  - `searchLinkedInCandidates(input)`: Caso de uso principal. Estrategia de búsqueda multicanal:
    1. **Serper API** (`SERPER_API_KEY`): Si está configurada, consulta `https://google.serper.dev/search` mediante POST en tiempo real.
    2. **Google Custom Search API** (`GOOGLE_SEARCH_API_KEY` & `GOOGLE_SEARCH_CX`): Intenta consulta REST a `customsearch/v1`.
    3. **Fallback contextualizado**: Si no hay API Keys o falla la conexión, devuelve estructura de prueba con enlaces de búsqueda directa a LinkedIn sin arrojar errores ni páginas 404.

### 2. Puerta de Entrada (`src/features/recruiter/sourcing/actions.ts`)
- **`buscarLinkedinAction`**: Valida la query de búsqueda con Zod, verifica autenticación del reclutador y llama al caso de uso de dominio.
- **`importarSourcingAction`**: Valida los datos del candidato con Zod, verifica que la sesión tenga rol autorizado e inserta el perfil en la base de datos a través de `insertCandidate`.

### 3. Interfaz de Usuario (`src/features/recruiter/sourcing/ui/`)
- **`LinkedInSourcingTab.tsx`**: Componente cliente con manejo de estados (`useTransition`), toast feedback (`useToast`), chips de ejemplo rápido e importación optimista.
- **`SourcingView.tsx`**: Vista principal del recruiter con selector de pestañas entre *Sourcing Booleano* y *LinkedIn Search (Prueba)*.

---

## 🔑 Variables de Entorno (`.env.local`)

| Variable | Descripción | Requerido |
| :--- | :--- | :--- |
| `SERPER_API_KEY` | API Key de [Serper.dev](https://serper.dev) (búsquedas de Google en tiempo real para perfiles reales de LinkedIn). | **Requerido** para personas reales |

---

## 🧪 Cómo Probar

1. **Acceso Protegido de Reclutador**:
   - Iniciar sesión en la app e ingresar a **Sourcing** ([http://localhost:3000/sourcing](http://localhost:3000/sourcing)).
   - Seleccionar la pestaña **LinkedIn Search (Prueba)**.
2. **Búsqueda en vivo**:
   - Ingresar `"backend engineer supabase python"` o hacer clic en uno de los chips de sugerencia.
   - Hacer clic en **"Buscar candidatos"**.
3. **Verificación de Enlaces e Importación**:
   - Presionar **"Ver perfil en LinkedIn ↗"** (abre la pestaña externa del perfil).
   - Presionar **"Importar a WeHunter"** (el candidato cambiará a `En el pool ✓` y se creará en Supabase en `/candidates`).
