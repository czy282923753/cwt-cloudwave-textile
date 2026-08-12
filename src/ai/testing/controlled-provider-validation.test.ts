import { readFile } from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import type { PreparedCoreRunV1 } from "@/ai/core/contracts";
import {
  classifyControlledMigrationFailureForTestV1,
  createControlledValidationAuthoritiesV1,
  isControlledValidationDatabaseLoopbackHostV1,
  loadControlledDeepSeekFixtureV1,
  parseControlledDeepSeekFixtureBytesForTestV1,
  runNode24LoopbackSemanticGateV1,
} from "./controlled-provider-validation";
import { PostgresMigrationCompatibilityError } from "@/db/postgres-enum-migration-compatibility";

const fixtureUrl = new URL("../../../test-fixtures/ai/deepseek-controlled-validation.v1.json", import.meta.url);

describe("Phase D controlled Provider validation authority", () => {
  it("strict-parses the sole fixture and binds every resource hash", async () => {
    const fixture = await loadControlledDeepSeekFixtureV1();
    expect(fixture).toMatchObject({
      fixtureHash: "6ee8e7504844d0a63aca49590c0d790e22cf911bea58b2d377bf23cf30bbe24a",
      fixtureCanonicalBytes: 3299,
      promptHash: "1edce2035e15e32a4e4fd4bca04f4a9f6d4c3796c86b63cdb9a28e4810f4c522",
      expectedOutputHash: "0c02a4bd2e5965a396b7eda1e816eacf989d074d48334e947f9ec5b4e2c812fc",
    });
    expect(fixture.promptBytes.byteLength).toBe(1259);
  });

  it.each([
    ["duplicate", (text: string) => text.replace('{\n  "fixtureFormatVersion": 1,', '{\n  "fixtureFormatVersion": 1,\n  "fixtureFormatVersion": 1,')],
    ["carriage-return", (text: string) => text.replace("\n", "\r\n")],
    ["missing-final-lf", (text: string) => text.slice(0, -1)],
    ["unknown-field", (text: string) => text.replace('{\n  "fixtureFormatVersion": 1,', '{\n  "unknown": true,\n  "fixtureFormatVersion": 1,')],
  ])("rejects %s fixture drift", async (_name, mutate) => {
    const text = await readFile(fixtureUrl, "utf8");
    expect(() => parseControlledDeepSeekFixtureBytesForTestV1(Buffer.from(mutate(text), "utf8")))
      .toThrow("controlled_fixture_invalid");
  });

  it("admits the exact safe tuple once and rejects replay or drift", async () => {
    const fixture = await loadControlledDeepSeekFixtureV1();
    const authorities = createControlledValidationAuthoritiesV1(fixture);
    const sourceIdentity = {
      origin: "typed_brief",
      controlled_validation_fixture_id: fixture.resource.fixtureId,
      controlled_validation_fixture_version: 1,
      controlled_validation_fixture_hash: fixture.fixtureHash,
    };
    const inputSources = [{
      alias: "src_01",
      sourceClass: "explicit_human_input",
      sourceIdentity,
      selectedFields: ["text"],
      fieldProvenance: [{ field: "text", provenance: "provided" as const }],
    }];
    const pre = {
      environment: "staging" as const,
      applicationClass: "draft_assistance",
      capability: "text" as const,
      useCase: "product_description_draft",
      requestedByPrincipalId: "d1111111-1111-4111-8111-111111111111",
      idempotencyKey: "d5555555-5555-4555-8555-555555555555",
      requestFingerprint: "023fa10bb4fa8451cd2b8306e9f6f2794f90190ac5af231d0e6e9626cd026813",
      inputHash: "f6da8cb61c760f6ddb92da64a0495beff690287417d83271b3954e41c5cffeb8",
      inputSources,
    };
    expect(authorities.executionAuthority.authorizePreConfiguration(pre)).toEqual({ ok: true, value: true });
    expect(authorities.executionAuthority.authorizePreConfiguration(pre))
      .toMatchObject({ ok: false, error: { code: "environment_not_authorized" } });

    const preparedRun: PreparedCoreRunV1 = {
      version: 1,
      applicationClass: "draft_assistance",
      useCase: "product_description_draft",
      capability: "text",
      requestIdentity: {
        idempotencyKey: pre.idempotencyKey,
        fingerprintVersion: 1,
        fingerprint: pre.requestFingerprint,
        requestedByPrincipalId: pre.requestedByPrincipalId,
      },
      association: {
        kind: "draft_target.v1",
        persistenceVersion: 1,
        value: {
          persistenceVersion: 1,
          kind: "draft_target.v1",
          targetType: "product_draft",
          targetProductId: "d3333333-3333-4333-8333-333333333333",
          targetLocale: "en",
          expectedTargetVersion: 1,
        },
      },
      associationSnapshotHash: "36dd336154ebf19626d2b1921506544bb6e8727ddfc916094838eb9321111e3f",
      resolvedConfig: {
        modelConfigId: "d4444444-4444-4444-8444-444444444444",
        modelConfigVersion: 1,
        resolvedConfigHash: "9b312bfeadaf10af5daeb1e67ccc5deef267dff42da720a10cd863332b73a49d",
        requestedProvider: "deepseek",
        requestedModel: "deepseek-v4-flash",
        parametersSnapshot: {},
        maxInputTokens: 2048,
        maxOutputTokens: 64,
        maxAttempts: 1,
        runCostLimitMicrousd: 400,
      },
      promptIdentity: {
        promptId: "pd11-deepseek-product-draft",
        promptVersion: 1,
        promptHash: "1edce2035e15e32a4e4fd4bca04f4a9f6d4c3796c86b63cdb9a28e4810f4c522",
      },
      providerEnvelope: {
        version: 1,
        hash: "28bdd2cedf963e65a817103fc41b5c0e636fff110938c590e6d80aedb6d68a0e",
      },
      inputSchemaVersion: 1,
      outputSchemaId: "cwt.ai.draft.product-description.v1",
      outputSchemaVersion: 1,
      policyVersion: "draft-product-description-v1",
      resultKind: "draft_candidate",
      dispositionKind: "draft_human_review",
      inputSources,
      inputContext: {},
      inputHash: pre.inputHash,
    };
    expect(authorities.executionAuthority.authorizePreparedRun({ environment: "staging", preparedRun }))
      .toEqual({ ok: true, value: true });
    expect(authorities.executionAuthority.authorizePreparedRun({ environment: "staging", preparedRun }))
      .toMatchObject({ ok: false, error: { code: "environment_not_authorized" } });
  });

  it("runs the reviewed real built-in-fetch loopback gate without external access", async () => {
    expect(await runNode24LoopbackSemanticGateV1()).toMatchObject({
      status: "PASS",
      redirect_status: 302,
      redirect_destination_hits: 0,
      runtime: { node: "24.14.0", platform: "darwin", arch: "arm64" },
    });
  });

  it("accepts only PostgreSQL bare loopback host projections", async () => {
    const source = await readFile(new URL("./controlled-provider-validation.ts", import.meta.url), "utf8");
    expect(source).toContain("host(inet_server_addr())::text as server_addr");
    expect(source).not.toContain("select inet_server_addr()::text as server_addr");
    expect(isControlledValidationDatabaseLoopbackHostV1("127.0.0.1")).toBe(true);
    expect(isControlledValidationDatabaseLoopbackHostV1("::1")).toBe(true);
    expect(isControlledValidationDatabaseLoopbackHostV1("127.0.0.1/32")).toBe(false);
    expect(isControlledValidationDatabaseLoopbackHostV1("203.0.113.10")).toBe(false);
  });

  it.each([
    [
      new PostgresMigrationCompatibilityError("MIGRATION_IDENTITY_MISMATCH", "Synthetic fixed test"),
      "controlled_validation_migration_folder_resolution_failed",
    ],
    [
      new PostgresMigrationCompatibilityError("MIGRATION_CLIENT_NOT_DEDICATED", "Synthetic fixed test"),
      "controlled_validation_migration_connection_failed",
    ],
    [
      new PostgresMigrationCompatibilityError("BACKEND_SESSION_CHANGED", "Synthetic fixed test"),
      "controlled_validation_migration_connection_failed",
    ],
    [
      new PostgresMigrationCompatibilityError("LOCK_UNAVAILABLE", "Synthetic fixed test"),
      "controlled_validation_migration_advisory_lock_failed",
    ],
    [
      new PostgresMigrationCompatibilityError("JOURNAL_CATALOG_MISMATCH", "Synthetic fixed test"),
      "controlled_validation_migration_journal_failed",
    ],
    [
      new PostgresMigrationCompatibilityError("POST_MIGRATION_VERIFICATION_FAILED", "Synthetic fixed test"),
      "controlled_validation_migration_journal_failed",
    ],
    [{ code: "ENOENT" }, "controlled_validation_migration_folder_resolution_failed"],
    [{ code: "ECONNREFUSED" }, "controlled_validation_migration_connection_failed"],
    [{ code: "08006" }, "controlled_validation_migration_connection_failed"],
    [{ code: "42501" }, "controlled_validation_migration_permission_failed"],
    [{ code: "42601" }, "controlled_validation_migration_sql_compatibility_failed"],
    [{ code: "42P01" }, "controlled_validation_migration_sql_compatibility_failed"],
  ])("classifies a fixed migration error without dynamic projection", (error, expected) => {
    expect(classifyControlledMigrationFailureForTestV1(error)).toBe(expected);
  });

  it("rejects unknown, inherited, accessor and trapped migration error properties", () => {
    let getterReads = 0;
    const accessor = Object.create(null) as Record<string, unknown>;
    Object.defineProperty(accessor, "code", {
      enumerable: true,
      get: () => {
        getterReads += 1;
        throw new Error("Synthetic getter must never execute");
      },
    });
    const inherited = Object.create({ code: "42501" }) as Record<string, unknown>;
    const trapped = new Proxy({}, {
      getOwnPropertyDescriptor: () => { throw new Error("Synthetic descriptor trap"); },
      getPrototypeOf: () => { throw new Error("Synthetic prototype trap"); },
    });

    expect(classifyControlledMigrationFailureForTestV1({ code: "UNREVIEWED_DYNAMIC_CODE" }))
      .toBe("controlled_validation_migration_entry_failed");
    expect(classifyControlledMigrationFailureForTestV1(inherited))
      .toBe("controlled_validation_migration_entry_failed");
    expect(classifyControlledMigrationFailureForTestV1(accessor))
      .toBe("controlled_validation_migration_entry_failed");
    expect(classifyControlledMigrationFailureForTestV1(trapped))
      .toBe("controlled_validation_migration_entry_failed");
    expect(getterReads).toBe(0);
  });

  it("never projects raw migration exception material", () => {
    const forbidden = [
      "Synthetic secret-shaped credential material",
      "postgresql://synthetic-user:synthetic-password@127.0.0.1/synthetic-database",
      "Authorization: Bearer synthetic-secret",
      "select synthetic_private_value from synthetic_private_table",
      "/synthetic/private/migration/path",
    ];
    const error = Object.assign(new Error(forbidden[0]), {
      code: "42501",
      stack: forbidden[1],
      query: forbidden[3],
      parameters: forbidden,
      cause: { credential: forbidden[2], path: forbidden[4] },
    });
    const projection = classifyControlledMigrationFailureForTestV1(error);
    expect(projection).toBe("controlled_validation_migration_permission_failed");
    for (const value of forbidden) expect(projection).not.toContain(value);
  });
});
