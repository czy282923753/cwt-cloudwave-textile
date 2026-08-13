import type { NextConfig } from "next";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const fixtureRoot = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(fixtureRoot, "../..");

const config: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: repositoryRoot,
  reactStrictMode: true,
  turbopack: { root: repositoryRoot },
};

export default config;
