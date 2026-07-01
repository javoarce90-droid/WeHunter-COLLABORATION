import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Default de Next es 1mb. El form de Workspace puede subir logo + portada del Career
      // Site en la misma acción (2MB + 2MB, ver IMAGE_MAX_BYTES en settings/schema.ts), así
      // que 1mb no alcanza — no es un problema de ancho de banda del usuario.
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
