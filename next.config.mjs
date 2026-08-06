import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts", "date-fns"],
  },
  // Declared explicitly rather than relying on tsconfig `paths` inference so the
  // alias resolves identically under webpack, Turbopack and `tsc`.
  turbopack: {
    root: projectRoot,
    resolveAlias: { "@": "./" },
  },
  webpack: (config) => {
    config.resolve.alias = { ...config.resolve.alias, "@": projectRoot };
    return config;
  },
};

export default nextConfig;
