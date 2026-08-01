import { rm } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { tmpdir } from "node:os";

export default async function globalTeardown(): Promise<void> {
  const configuredRoot = process.env.CWT_E2E_TEMP_ROOT;
  if (!configuredRoot) return;

  const root = resolve(configuredRoot);
  const expectedParent = resolve(tmpdir());
  if (dirname(root) !== expectedParent || !basename(root).startsWith("cwt-phase1a-e2e-")) {
    throw new Error("Refusing to remove an unrecognized E2E temporary directory.");
  }
  await rm(root, { recursive: true, force: true });
}
