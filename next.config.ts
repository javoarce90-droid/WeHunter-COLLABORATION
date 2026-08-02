import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Default de Next es 1mb. Los forms de Workspace y Career Site suben imágenes de hasta
      // 2MB (ver IMAGE_MAX_BYTES en settings/schema.ts y career-site/schema.ts), así que 1mb
      // no alcanza — no es un problema de ancho de banda del usuario.
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
