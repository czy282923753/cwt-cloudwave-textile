import type { NextConfig } from "next";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const fixtureRoot = dirname(fileURLToPath(import.meta.url));

const config: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: fixtureRoot,
  reactStrictMode: true,
  turbopack: { root: fixtureRoot },
};

export default config;
