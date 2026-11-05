import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components desactivado a propósito: usamos el modelo clásico para poder
  // marcar las páginas con `export const dynamic = 'force-dynamic'` (ver CLAUDE.md,
  // la versión anterior tuvo problemas de caché).
  cacheComponents: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
