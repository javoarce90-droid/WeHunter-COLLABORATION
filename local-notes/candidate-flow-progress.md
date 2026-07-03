# Estado de Desarrollo: Flujo del Candidato

Este documento resume todo lo que hemos avanzado hasta ahora en la rama `feat/candidate-setup` con respecto a la experiencia del candidato.

## 1. Autenticación y Perfil (Completado en el commit inicial)
- **Rutas de Auth (`/c/login`, `/c/register`):** Creación de las páginas de inicio de sesión y registro para candidatos.
- **Formularios de UI:** Implementación de `CandidateLoginForm`, `CandidateRegisterForm` y `CandidateProfileForm`.
- **Lógica de Dominio (Feature: `candidate/profile`):** 
  - Caso de uso `actualizar-perfil` con sus respectivos tests.
  - Esquemas de validación (Zod).
  - Mutaciones y queries para actualizar los datos en la base de datos de Supabase.
  - Integración de Storage para permitir la subida del currículum (CV).
- **Tipado de Base de Datos:** Se agregó la exportación del tipo `Profile` en el schema principal de Drizzle.

## 2. Trabajo en Progreso Actual (WIP - No commiteado aún)
- **Portal de Empleos (`/portal`):**
  - Construcción del portal público donde los candidatos pueden ver búsquedas abiertas.
  - Feature slice `candidate/portal` que incluye mock de datos de empleos, y casos de uso para: `filtrar-empleos`, `gestionar-favoritos` y `gestionar-postulacion`.
  - Componentes visuales clave: `JobCard`, `ApplicationModal`, y `ApplicationStepper` para guiar al usuario en la postulación.
- **Mis Postulaciones (`/portal/mis-postulaciones`):** Creación de la ruta para que el candidato haga seguimiento de los procesos en los que participa.
- **Verificación de Email (`/c/verify-email`):** Agregada la ruta para manejar la validación de correos tras el registro.
- **Ajustes en el Perfil:** Pequeñas modificaciones en `/c/profile/page.tsx` y en las Server Actions de `candidate/profile/actions.ts`.

> **Próximos pasos:** Terminar de conectar el portal de empleos con el backend, pulir el Modal de postulación y commitear el progreso del portal.
