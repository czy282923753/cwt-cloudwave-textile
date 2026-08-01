import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";

const serverAppRoot = ".next/server/app";
const forbidden = ["@refinedev", "/src/admin/", "RefineAdminProvider"];

async function filesUnder(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await filesUnder(path)));
    else files.push(path);
  }
  return files;
}

const manifests = (await filesUnder(serverAppRoot)).filter((path) => {
  const name = relative(serverAppRoot, path).replaceAll("\\", "/");
  return (
    name.endsWith("page_client-reference-manifest.js") &&
    !name.startsWith("admin/") &&
    !name.startsWith("operations-login/")
  );
});

if (manifests.length === 0) {
  throw new Error("No fresh public page client-reference manifests were found.");
}

const checked = new Set();
const leaks = [];
for (const manifestPath of manifests) {
  const manifest = await readFile(manifestPath, "utf8");
  checked.add(manifestPath);
  for (const needle of forbidden) {
    if (manifest.includes(needle)) leaks.push(`${manifestPath}: ${needle}`);
  }
  const chunkPaths = manifest.match(/static\/chunks\/[^"'\\]+\.js/g) ?? [];
  for (const chunkPath of chunkPaths) {
    const localPath = join(".next", chunkPath);
    if (checked.has(localPath)) continue;
    checked.add(localPath);
    const chunk = await readFile(localPath, "utf8");
    for (const needle of forbidden) {
      if (chunk.includes(needle)) leaks.push(`${localPath}: ${needle}`);
    }
  }
}

if (leaks.length > 0) {
  throw new Error(`Admin-only dependencies leaked into public bundles:\n${leaks.join("\n")}`);
}

process.stdout.write(
  `Public bundle boundary verified across ${manifests.length} public page manifests and ${checked.size} manifest/chunk files.\n`,
);
