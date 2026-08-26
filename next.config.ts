import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Default de Next es 1mb. Los forms de Workspace y Career Site suben imágenes de hasta
      // 2MB (ver IMAGE_MAX_BYTES en settings/schema.ts y career-site/schema.ts), así que 1mb
      // no alcanza — no es un problema de ancho de banda del usuario.
      bodySizeLimit: "6mb",
    },
    // `staleTimes.dynamic` es un solo balde global — Next no permite un valor distinto por
    // ruta. Prioridad: que las subtabs de jobs/[id] (Detalle/Aviso/Postulados/Pipeline/...)
    // reusen del lado del cliente lo ya visitado/prefetcheado en vez de recargar cada vez.
    // El costo es el mismo balde para Comunidad/Career Site/enlaces con token (client, share):
    // igual quedan protegidas server-side por su propio `dynamic = "force-dynamic"` (cada
    // request real al server SIEMPRE calcula fresco); lo único que se relaja es que, por hasta
    // este ventana, el router del cliente puede mostrar sin pedir de nuevo un RSC ya visitado o
    // prefetcheado (ej. volver atrás justo después de guardar). Punto medio elegido: 20s.
    staleTimes: {
      dynamic: 20,
    },
  },
};

export default nextConfig;
