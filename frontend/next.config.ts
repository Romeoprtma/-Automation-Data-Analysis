import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: 'export',
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: false,       // <-- UBAH MENJADI false
  partialPrefetching: false,    // <-- TAMBAHKAN DAN SET KE false
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
