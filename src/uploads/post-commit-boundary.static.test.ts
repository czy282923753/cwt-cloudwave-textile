import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("Finalize post-commit architecture boundary", () => {
  it("keeps post-commit Cleanup outside the core failure boundary and defensively rechecks completed state", async () => {
    const source = await readFile("src/uploads/admin-upload-service.ts", "utf8");
    const finalizeStart = source.indexOf("export async function finalizeAdminUploadBatch");
    const coreCatch = source.indexOf("} catch (error) {", finalizeStart);
    const postCommitReturn = source.indexOf("return runFinalizePostCommitMaintenance", coreCatch);
    expect(finalizeStart).toBeGreaterThan(-1);
    expect(coreCatch).toBeGreaterThan(finalizeStart);
    expect(postCommitReturn).toBeGreaterThan(coreCatch);
    const coreFailureBlock = source.slice(coreCatch, postCommitReturn);
    expect(coreFailureBlock).toContain("readCompletedFinalizeResult");
    expect(coreFailureBlock.indexOf("readCompletedFinalizeResult"))
      .toBeLessThan(coreFailureBlock.indexOf("markFinalizeRecoveryRequired"));
    expect(coreFailureBlock).not.toContain("finalize-private-");
    const postCommitHelper = source.slice(
      source.indexOf("async function runFinalizePostCommitMaintenance"),
      finalizeStart,
    );
    expect(postCommitHelper).toContain("processPendingObjectCleanupJobs");
    expect(postCommitHelper).toContain("asset.finalize.post_commit_warning");
    expect(postCommitHelper).toContain("privateCleanupPending = true");
  });

  it("requires locked Cleanup identity and verified Manifest evidence at public boundaries", async () => {
    const [cleanup, eligibility, migration, snapshot] = await Promise.all([
      readFile("src/uploads/object-cleanup-service.ts", "utf8"),
      readFile("src/uploads/asset-eligibility.ts", "utf8"),
      readFile("drizzle/0015_post-commit-boundary-closure.sql", "utf8"),
      readFile("drizzle/meta/0015_snapshot.json", "utf8"),
    ]);
    expect(cleanup).toContain("projectionChangedAfterRead");
    expect(cleanup).toContain("cleanup_identity_mismatch_manual_review");
    expect(cleanup.indexOf("projectionChangedAfterRead")).toBeLessThan(cleanup.indexOf("storage.delete"));
    expect(eligibility).toContain("evidence_status <> 'verified'");
    expect(migration).toContain("object_cleanup_jobs_finalize_recovery_id_upload_recovery_jobs_id_fk");
    expect(migration).toContain("migration_0015_legacy_inferred");
    expect(snapshot).toContain('"finalize_recovery_id"');
    expect(snapshot).toContain('"upload_recovery_jobs"');
  });
});
