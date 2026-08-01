import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const results = {
  node: process.version,
  arch: process.arch,
  platform: process.platform,
  pnpm: execFileSync("pnpm", ["--version"], { encoding: "utf8" }).trim(),
  sharp: "failed",
  lightningCss: "failed",
  swc: "failed",
};

try {
  const sharp = (await import("sharp")).default;
  await sharp({ create: { width: 1, height: 1, channels: 3, background: "white" } })
    .png()
    .toBuffer();
  results.sharp = `ok (${sharp.versions.sharp})`;
} catch (error) {
  results.sharp = `failed (${error instanceof Error ? error.message : "unknown"})`;
}
try {
  const tailwindPostcssRequire = createRequire(require.resolve("@tailwindcss/postcss"));
  const tailwindNodeRequire = createRequire(
    tailwindPostcssRequire.resolve("@tailwindcss/node"),
  );
  const lightning = tailwindNodeRequire("lightningcss");
  lightning.transform({ filename: "diagnostic.css", code: Buffer.from("a{color:red}") });
  results.lightningCss = `ok (${tailwindNodeRequire.resolve("lightningcss")})`;
} catch (error) {
  results.lightningCss = `failed (${error instanceof Error ? error.message : "unknown"})`;
}
try {
  const swcPackage = `@next/swc-${process.platform}-${process.arch}`;
  const nextRequire = createRequire(require.resolve("next/package.json"));
  nextRequire(swcPackage);
  results.swc = `ok (${nextRequire.resolve(swcPackage)})`;
} catch (error) {
  results.swc = `failed (${error instanceof Error ? error.message : "unknown"})`;
}

process.stdout.write(`${JSON.stringify(results, null, 2)}\n`);
if ([results.sharp, results.lightningCss, results.swc].some((value) => value.startsWith("failed"))) {
  process.exitCode = 1;
}
