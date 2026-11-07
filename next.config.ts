import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Next.js 16.4.3 Core Optimizations */
  cacheComponents: true,
  partialPrefetching: true,
  typedRoutes: true,
  reactCompiler: true,

  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },

  experimental: {
    turbopackRustReactCompiler: true,
    turbopackLazyDynamicImports: true,
    turbopackLazyDynamicImportsSSR: true,
    turbopackGc: true,
    optimizePackageImports: ["@base-ui/react", "lucide-react"],
  },
};

export default nextConfig;
