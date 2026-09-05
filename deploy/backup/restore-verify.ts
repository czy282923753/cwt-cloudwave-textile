import { randomBytes, createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";

async function main(): Promise<void> {
  const root = process.env.CWT_RESTORE_ROOT!;
  // Imported application modules observe only this fresh Synthetic configuration.
  Object.assign(process.env, {
    APP_ENV: "test", DATABASE_DRIVER: "postgres", DATABASE_POOL_MAX: "1",
    DATABASE_URL: "", // postgres-js uses the isolated PGHOST/PGDATABASE/PGUSER socket settings.
    AUTH_SESSION_SECRET: randomBytes(32).toString("hex"),
    PUBLIC_STORAGE_ROOT: join(root, "public"), PRIVATE_STORAGE_ROOT: join(root, "private"), IMPORT_STORAGE_ROOT: join(root, "import"),
    STORAGE_DRIVER: "local", NON_PRODUCTION_NOINDEX: "true", NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
    ANALYTICS_DRIVER: "disabled", EMAIL_DRIVER: "log", INQUIRY_NOTIFICATION_TO: "restore-sink@example.test",
    FEATURE_AI: "false", FEATURE_SEO_ASSISTANT: "false",
  });
  const { databaseConnection } = await import("../../src/db/client");
  try {
    const { verifyDatabaseReadiness, assertDatabaseReady } = await import("../../src/db/readiness");
    const { assets, assetVariants } = await import("../../src/db/schema");
    const { findPublicAssetForDelivery } = await import("../../src/public-site/public-asset-access");
    const { assertSafeObjectKey } = await import("../../src/storage/safe-key");
    const { createImageDerivatives } = await import("../../src/uploads/image-derivatives");
    if (databaseConnection.kind !== "postgres") throw new Error("Restore requires PostgreSQL");
    const db = databaseConnection.db;
    assertDatabaseReady(await verifyDatabaseReadiness(db));
    const inventoryText = await readFile(join(root, "restored-objects.jsonl"), "utf8");
    const retainedKeys = new Set(inventoryText.trim().split("\n").filter(Boolean).map(line => {
      const item = JSON.parse(line) as { partition: string; key: string };
      return `${item.partition}/${item.key}`;
    }));
    const originals = (await db.select().from(assets)).filter(asset => retainedKeys.has(`${asset.storagePartition}/${asset.objectKey}`));
    const variants = await db.select().from(assetVariants);
    for (const asset of originals) {
      assertSafeObjectKey(asset.objectKey);
      const bytes = await readFile(join(root, asset.storagePartition, asset.objectKey));
      if (bytes.length !== asset.byteSize || createHash("sha256").update(bytes).digest("hex") !== asset.sha256) throw new Error("Restored bytes mismatch");
      const authority = await findPublicAssetForDelivery(db, asset.id);
      if (asset.storagePartition === "private" && authority !== null) throw new Error("Private exposure");
      const recorded = variants.filter(variant => variant.sourceAssetId === asset.id);
      if (!recorded.length) continue;
      const regenerated = await createImageDerivatives(bytes);
      for (const variant of recorded) {
        assertSafeObjectKey(variant.objectKey);
        const rebuilt = regenerated.find(item => item.key === variant.variantKey && item.format === variant.format);
        if (!rebuilt || rebuilt.bytes.length !== variant.byteSize || rebuilt.width !== variant.width || rebuilt.height !== variant.height) throw new Error("Derivative recipe drift");
        const destination = join(root, asset.storagePartition, variant.objectKey);
        await mkdir(dirname(destination), { recursive: true, mode: 0o700 });
        await writeFile(destination, rebuilt.bytes, { flag: "wx", mode: 0o600 });
        // Query the existing delivery authority; rebuilding bytes never changes eligibility.
        const delivery = await findPublicAssetForDelivery(db, asset.id, variant.variantKey);
        if (delivery && delivery.objectKey !== variant.objectKey) throw new Error("Variant authority mismatch");
      }
    }
    process.stdout.write("Restored database, original bytes, private isolation and derivative readiness verified.\n");
  } catch {
    process.stderr.write("Restored application readiness failed; keep the isolated target stopped.\n");
    process.exitCode = 1;
  } finally {
    await databaseConnection.close();
  }

}
void main().catch(() => { process.stderr.write("Restore verification setup failed.\n"); process.exitCode = 1; });
