import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Default de Next es 1mb. Los forms de Workspace y Career Site suben imágenes de hasta
      // 2MB (ver IMAGE_MAX_BYTES en settings/schema.ts y career-site/schema.ts), así que 1mb
      // no alcanza — no es un problema de ancho de banda del usuario.
      bodySizeLimit: "6mb",
    },
    // Default de Next (30s) reusa del lado del cliente el RSC payload de una página dinámica
    // ya visitada — `dynamic = "force-dynamic"` solo garantiza render fresco en el SERVIDOR,
    // no evita que el router del cliente sirva una versión vieja al volver a navegar (ej.
    // Comunidad o el Career Site público después de guardar cambios). En 0 siempre revalida.
    staleTimes: {
      dynamic: 0,
    },
  },
};

export default nextConfig;
