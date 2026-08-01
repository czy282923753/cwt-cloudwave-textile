import { readFile } from "node:fs/promises";

const manifestPath = ".next/server/app/page_client-reference-manifest.js";
const manifest = await readFile(manifestPath, "utf8");
const forbidden = ["@refinedev", "/src/admin/", "RefineAdminProvider"];
const leaks = forbidden.filter((needle) => manifest.includes(needle));

if (leaks.length > 0) {
  throw new Error(
    `Admin-only dependencies leaked into the public page bundle: ${leaks.join(
      ", ",
    )}`,
  );
}

console.log("Public bundle boundary verified: no Refine/admin modules detected.");
