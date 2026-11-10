import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: 'export',
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  // partialPrefetching: true, <-- HAPUS ATAU BERI KOMENTAR PADA BARIS INI
  reactCompiler: true,
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
