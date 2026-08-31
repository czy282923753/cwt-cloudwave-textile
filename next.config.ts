import type { NextConfig } from "next";

const RELEASE_ID_PATTERN = /^[0-9a-f]{40}$/u;

function requireReleaseId(): string {
  const releaseId = process.env.CWT_RELEASE_ID ?? "";
  if (!RELEASE_ID_PATTERN.test(releaseId)) {
    throw new Error("CWT_RELEASE_ID must be the full lowercase 40-character source commit.");
  }
  return releaseId;
}

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  trailingSlash: true,
  output: "standalone",
  serverExternalPackages: ["@electric-sql/pglite", "@valkey/valkey-glide"],
  ...(process.env.DATABASE_DRIVER !== "postgres"
    ? { experimental: { cpus: 1 } }
    : {}),
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [],
  },
  generateBuildId: async () => requireReleaseId(),
};

export default nextConfig;
