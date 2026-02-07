import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  transpilePackages: ["@hustlebots/shared"],
  turbopack: {
    resolveAlias: {
      "@hustlebots/shared": path.resolve(
        __dirname,
        "../shared/src/index.ts"
      ),
    },
  },
  webpack: (config) => {
    config.resolve.alias["@hustlebots/shared"] = path.resolve(
      __dirname,
      "../shared/src/index.ts"
    );
    return config;
  },
};

export default nextConfig;
