import type { NextConfig } from "next";

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
  async headers() {
    const indexingAllowed =
      process.env.APP_ENV === "production" &&
      process.env.NON_PRODUCTION_NOINDEX !== "true";
    const securityHeaders = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=(), payment=()",
      },
      {
        key: "Content-Security-Policy",
        value: [
          "default-src 'self'",
          "base-uri 'self'",
          "object-src 'none'",
          "frame-ancestors 'none'",
          "form-action 'self'",
          "img-src 'self' data: blob: https:",
          "font-src 'self' data:",
          "style-src 'self' 'unsafe-inline'",
          "script-src 'self' 'unsafe-inline'",
          "connect-src 'self' https:",
        ].join("; "),
      },
    ];
    if (process.env.APP_ENV === "production") {
      securityHeaders.push({
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      });
    }
    if (!indexingAllowed) {
      securityHeaders.push({
        key: "X-Robots-Tag",
        value: "noindex, nofollow, noarchive",
      });
    }
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
