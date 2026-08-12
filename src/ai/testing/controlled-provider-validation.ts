import "server-only";

import { once } from "node:events";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";

import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";

import {
  createPhaseCClaimedApplicationRegistryV1,
  createPhaseCDurableDraftAssistanceServiceV1,
} from "@/ai/applications/draft-assistance/composition";
import type {
  ControlledValidationSourceAttestorV1,
} from "@/ai/applications/draft-assistance/context";
import type { DraftAssistanceCommandV1 } from "@/ai/applications/draft-assistance/contracts";
import {
  canonicalJsonHash,
  canonicalizeJson,
  sha256Hex,
  type ReadonlyJsonObject,
  type ReadonlyJsonValue,
} from "@/ai/canonical-json";
import type {
  ControlledValidationExecutionAuthorityV1,
  PreparedCoreRunV1,
} from "@/ai/core/contracts";
import { aiFailure, aiSuccess } from "@/ai/errors";
import { createAiRunWorkerV1 } from "@/ai/runs/worker";
import { createPromptBundleLoaderV1, type PromptBundleLoaderV1 } from "@/ai/prompts/loader";
import { createTextProviderRegistryV1 } from "@/ai/providers/registry";
import { migrateDatabase } from "@/db/migrate";
import * as databaseSchema from "@/db/schema";
import {
  aiModelConfig,
  aiRuns,
  auditLogs,
  featureFlags,
  productLocalizations,
  productTaxonomyTerms,
  products,
  taxonomyTerms,
  users,
} from "@/db/schema";
import type { DatabaseConnection, PostgresAppDatabase } from "@/db/client";
import { createDeepSeekTextProviderV1 } from "@/integrations/ai/providers/deepseek-text-adapter";
import {
  runDeepSeekOfficialSourcePreflightV1,
  type DeepSeekOfficialSourceProjectionV1,
} from "@/integrations/ai/providers/deepseek-official-source-preflight";
import {
  createDeepSeekPricingPolicyRegistryV1,
  deepSeekPricingSnapshotV2,
} from "@/integrations/ai/providers/deepseek-pricing";

const FIXTURE_ID = "SYN-AI-PRODUCT-BASE-01-PHASE-D-CONTROLLED-01";
const FIXTURE_HASH = "6ee8e7504844d0a63aca49590c0d790e22cf911bea58b2d377bf23cf30bbe24a";
const PROMPT_HASH = "1edce2035e15e32a4e4fd4bca04f4a9f6d4c3796c86b63cdb9a28e4810f4c522";
const TARGET_HASH = "36dd336154ebf19626d2b1921506544bb6e8727ddfc916094838eb9321111e3f";
const INPUT_HASH = "f6da8cb61c760f6ddb92da64a0495beff690287417d83271b3954e41c5cffeb8";
const EXPLICIT_INPUT_HASH = "a5d32996087908d35645955d54a7bb419e247fd9e2f275f6527ca1a962f163c9";
const REQUEST_FINGERPRINT = "023fa10bb4fa8451cd2b8306e9f6f2794f90190ac5af231d0e6e9626cd026813";
const EXPECTED_OUTPUT_HASH = "0c02a4bd2e5965a396b7eda1e816eacf989d074d48334e947f9ec5b4e2c812fc";
const PROTECTED_OUTPUT_HASH = "3efbc524f3df75c73e97ef9e414a47fb531d544bc650c66b4df38fdc7e63506f";
const RESOLVED_CONFIG_HASH = "9b312bfeadaf10af5daeb1e67ccc5deef267dff42da720a10cd863332b73a49d";
const ENVELOPE_HASH = "28bdd2cedf963e65a817103fc41b5c0e636fff110938c590e6d80aedb6d68a0e";
const RENDERED_INSTRUCTION_HASH = "4aeaa1ba6f799a32f821fb007caecf8625dfbd1503b2f7123c31d6e9288a789e";
const PROVIDER_REQUEST_IDENTITY_HASH = "afba78fff0b7aff8660bfe0b6db0b15ae7cdb3b5edb628cb7722226d4d78b3ef";
const ACTOR_ID = "d1111111-1111-4111-8111-111111111111";
const TAXONOMY_ID = "d2222222-2222-4222-8222-222222222222";
const PRODUCT_ID = "d3333333-3333-4333-8333-333333333333";
const CONFIG_ID = "d4444444-4444-4444-8444-444444444444";
const IDEMPOTENCY_KEY = "d5555555-5555-4555-8555-555555555555";
const FIXTURE_URL = new URL("../../../test-fixtures/ai/deepseek-controlled-validation.v1.json", import.meta.url);

interface ControlledFixtureV1 extends ReadonlyJsonObject {
  readonly fixtureFormatVersion: 1;
  readonly fixtureId: typeof FIXTURE_ID;
  readonly fixtureVersion: 1;
  readonly classification: string;
  readonly database: ReadonlyJsonObject & {
    readonly actor: ReadonlyJsonObject & {
      readonly id: typeof ACTOR_ID;
      readonly email: string;
      readonly displayName: string;
      readonly role: "product_editor";
      readonly passwordHash: string;
    };
    readonly taxonomy: ReadonlyJsonObject & {
      readonly id: typeof TAXONOMY_ID;
      readonly internalKey: string;
      readonly dimension: "material_fiber";
    };
    readonly product: ReadonlyJsonObject & {
      readonly id: typeof PRODUCT_ID;
      readonly status: "draft";
      readonly locale: "en";
      readonly name: string;
      readonly editorDocumentVersion: 1;
    };
    readonly featureFlag: ReadonlyJsonObject & { readonly key: "ai"; readonly enabled: true };
  };
  readonly command: ReadonlyJsonObject & {
    readonly applicationClass: "draft_assistance";
    readonly capability: "text";
    readonly useCase: "product_description_draft";
    readonly idempotencyKey: typeof IDEMPOTENCY_KEY;
    readonly target: ReadonlyJsonObject;
    readonly contextSelections: readonly ReadonlyJsonObject[];
    readonly explicitInput: string;
  };
  readonly modelConfig: ReadonlyJsonObject & {
    readonly id: typeof CONFIG_ID;
    readonly provider: "deepseek";
    readonly model: "deepseek-v4-flash";
    readonly parameters: ReadonlyJsonObject;
    readonly maxInputTokens: 2048;
    readonly maxOutputTokens: 64;
    readonly maxAttempts: 1;
    readonly runCostLimitMicrousd: 400;
    readonly promptId: "pd11-deepseek-product-draft";
    readonly promptVersion: 1;
    readonly enabled: true;
    readonly isDefault: true;
  };
  readonly promptResource: ReadonlyJsonObject;
  readonly expectedOutput: ReadonlyJsonObject;
}

export interface LoadedControlledFixtureV1 {
  readonly resource: ControlledFixtureV1;
  readonly fixtureHash: typeof FIXTURE_HASH;
  readonly fixtureCanonicalBytes: 3299;
  readonly promptHash: typeof PROMPT_HASH;
  readonly promptBytes: Uint8Array;
  readonly expectedOutputHash: typeof EXPECTED_OUTPUT_HASH;
}

function duplicateFreeJson(text: string): boolean {
  let offset = 0;
  const whitespace = () => { while (/\s/u.test(text[offset] ?? "")) offset += 1; };
  const stringValue = (): string | undefined => {
    if (text[offset] !== '"') return undefined;
    const start = offset;
    offset += 1;
    while (offset < text.length) {
      if (text[offset] === "\\") {
        offset += 2;
        continue;
      }
      if (text[offset] === '"') {
        offset += 1;
        try { return JSON.parse(text.slice(start, offset)) as string; } catch { return undefined; }
      }
      offset += 1;
    }
    return undefined;
  };
  const value = (): boolean => {
    whitespace();
    if (text[offset] === '"') return stringValue() !== undefined;
    if (text[offset] === "{") {
      offset += 1;
      whitespace();
      const keys = new Set<string>();
      if (text[offset] === "}") { offset += 1; return true; }
      while (true) {
        whitespace();
        const key = stringValue();
        if (key === undefined || keys.has(key)) return false;
        keys.add(key);
        whitespace();
        if (text[offset] !== ":") return false;
        offset += 1;
        if (!value()) return false;
        whitespace();
        if (text[offset] === "}") { offset += 1; return true; }
        if (text[offset] !== ",") return false;
        offset += 1;
      }
    }
    if (text[offset] === "[") {
      offset += 1;
      whitespace();
      if (text[offset] === "]") { offset += 1; return true; }
      while (true) {
        if (!value()) return false;
        whitespace();
        if (text[offset] === "]") { offset += 1; return true; }
        if (text[offset] !== ",") return false;
        offset += 1;
      }
    }
    const remaining = text.slice(offset);
    const token = /^(?:true|false|null|-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?)/u.exec(remaining)?.[0];
    if (token === undefined) return false;
    offset += token.length;
    return true;
  };
  if (!value()) return false;
  whitespace();
  return offset === text.length;
}

export function parseControlledDeepSeekFixtureBytesForTestV1(
  bytes: Uint8Array,
): LoadedControlledFixtureV1 {
  let text: string;
  try { text = new TextDecoder("utf-8", { fatal: true }).decode(bytes); } catch {
    throw new Error("controlled_fixture_invalid");
  }
  if (bytes[bytes.length - 1] !== 0x0a || text.startsWith("\uFEFF") || text.includes("\r") ||
    text.endsWith("\n\n") || !duplicateFreeJson(text)) throw new Error("controlled_fixture_invalid");
  let parsed: unknown;
  try { parsed = JSON.parse(text) as unknown; } catch { throw new Error("controlled_fixture_invalid"); }
  const fixture = canonicalJsonHash(parsed);
  if (!fixture.ok || fixture.value.hash !== FIXTURE_HASH ||
    Buffer.byteLength(fixture.value.canonicalJson, "utf8") !== 3299) throw new Error("controlled_fixture_invalid");
  const resource = parsed as ControlledFixtureV1;
  if (resource.fixtureId !== FIXTURE_ID || resource.fixtureVersion !== 1) {
    throw new Error("controlled_fixture_invalid");
  }
  const prompt = canonicalizeJson(resource.promptResource);
  if (!prompt.ok) throw new Error("controlled_fixture_invalid");
  const promptBytes = Buffer.from(`${prompt.value}\n`, "utf8");
  if (promptBytes.byteLength !== 1259 || sha256Hex(promptBytes) !== PROMPT_HASH) {
    throw new Error("controlled_fixture_invalid");
  }
  const expected = canonicalJsonHash(resource.expectedOutput);
  if (!expected.ok || expected.value.hash !== EXPECTED_OUTPUT_HASH) throw new Error("controlled_fixture_invalid");
  return Object.freeze({
    resource,
    fixtureHash: FIXTURE_HASH,
    fixtureCanonicalBytes: 3299,
    promptHash: PROMPT_HASH,
    promptBytes,
    expectedOutputHash: EXPECTED_OUTPUT_HASH,
  });
}

export async function loadControlledDeepSeekFixtureV1(): Promise<LoadedControlledFixtureV1> {
  return parseControlledDeepSeekFixtureBytesForTestV1(await readFile(FIXTURE_URL));
}

function controlledSourceIdentity(inputSources: readonly import("@/ai/core/contracts").SafeInputSourceReferenceV1[]) {
  if (inputSources.length !== 1) return false;
  const source = inputSources[0];
  const identity = source?.sourceIdentity;
  return source !== undefined && identity !== undefined && source.alias === "src_01" &&
    source.sourceClass === "explicit_human_input" &&
    identity.origin === "typed_brief" &&
    identity.controlled_validation_fixture_id === FIXTURE_ID &&
    identity.controlled_validation_fixture_version === 1 &&
    identity.controlled_validation_fixture_hash === FIXTURE_HASH &&
    Object.keys(identity).sort().join("\u0000") === [
      "controlled_validation_fixture_hash",
      "controlled_validation_fixture_id",
      "controlled_validation_fixture_version",
      "origin",
    ].join("\u0000");
}

function providerRequestIdentity(preparedRun: PreparedCoreRunV1): string | undefined {
  const identity = canonicalJsonHash({
    schema: "cwt.provider-request-identity",
    version: 1,
    application_class: preparedRun.applicationClass,
    use_case: preparedRun.useCase,
    idempotency_key: preparedRun.requestIdentity.idempotencyKey,
    request_fingerprint_version: preparedRun.requestIdentity.fingerprintVersion,
    request_fingerprint: preparedRun.requestIdentity.fingerprint,
    model_config_id: preparedRun.resolvedConfig.modelConfigId,
    model_config_version: preparedRun.resolvedConfig.modelConfigVersion,
    resolved_config_hash: preparedRun.resolvedConfig.resolvedConfigHash,
    requested_provider: preparedRun.resolvedConfig.requestedProvider,
    requested_model: preparedRun.resolvedConfig.requestedModel,
    parameters_snapshot_json: preparedRun.resolvedConfig.parametersSnapshot,
    max_input_tokens: preparedRun.resolvedConfig.maxInputTokens,
    max_output_tokens: preparedRun.resolvedConfig.maxOutputTokens,
    max_attempts: preparedRun.resolvedConfig.maxAttempts,
    prompt_id: preparedRun.promptIdentity.promptId,
    prompt_version: preparedRun.promptIdentity.promptVersion,
    prompt_hash: preparedRun.promptIdentity.promptHash,
    provider_envelope_version: preparedRun.providerEnvelope.version,
    provider_envelope_hash: preparedRun.providerEnvelope.hash,
    input_schema_version: preparedRun.inputSchemaVersion,
    output_schema_version: preparedRun.outputSchemaVersion,
    policy_version: preparedRun.policyVersion,
    input_hash: preparedRun.inputHash,
    controlled_validation_fixture_id: FIXTURE_ID,
    controlled_validation_fixture_hash: FIXTURE_HASH,
  });
  return identity.ok ? identity.value.hash : undefined;
}

export function createControlledValidationAuthoritiesV1(
  fixture: LoadedControlledFixtureV1,
): {
  readonly executionAuthority: ControlledValidationExecutionAuthorityV1;
  readonly sourceAttestor: ControlledValidationSourceAttestorV1;
} {
  let preAuthorized = false;
  let preparedAuthorized = false;
  const sourceAttestor: ControlledValidationSourceAttestorV1 = Object.freeze({
    attestExplicitSource(input: Parameters<ControlledValidationSourceAttestorV1["attestExplicitSource"]>[0]) {
      const command = input.command;
      const target = command.target;
      const exact = command.useCase === "product_description_draft" &&
        command.actor.userId === ACTOR_ID && command.actor.role === "product_editor" &&
        command.idempotencyKey === IDEMPOTENCY_KEY && command.explicitInput === fixture.resource.command.explicitInput &&
        command.contextSelections.length === 1 &&
        command.contextSelections[0]?.sourceClass === "explicit_human_input" &&
        command.contextSelections[0].origin === "typed_brief" && input.origin === "typed_brief" &&
        target.type === "product_draft" && target.productId === PRODUCT_ID && target.locale === "en" &&
        target.expectedVersion === 1 && input.association.targetType === "product_draft" &&
        input.association.targetProductId === PRODUCT_ID && input.association.targetLocale === "en" &&
        input.association.expectedTargetVersion === 1;
      return exact ? aiSuccess({ fixtureId: FIXTURE_ID, fixtureVersion: 1 as const, fixtureHash: FIXTURE_HASH })
        : aiFailure("context_provenance_mismatch");
    },
  });
  const executionAuthority: ControlledValidationExecutionAuthorityV1 = Object.freeze({
    authorizePreConfiguration(input: Parameters<ControlledValidationExecutionAuthorityV1["authorizePreConfiguration"]>[0]) {
      if (preAuthorized || input.environment !== "staging" ||
        input.applicationClass !== "draft_assistance" || input.capability !== "text" ||
        input.useCase !== "product_description_draft" || input.requestedByPrincipalId !== ACTOR_ID ||
        input.idempotencyKey !== IDEMPOTENCY_KEY || input.requestFingerprint !== REQUEST_FINGERPRINT ||
        input.inputHash !== INPUT_HASH || !controlledSourceIdentity(input.inputSources)) {
        return aiFailure("environment_not_authorized");
      }
      preAuthorized = true;
      return aiSuccess(true as const);
    },
    authorizePreparedRun(input: Parameters<ControlledValidationExecutionAuthorityV1["authorizePreparedRun"]>[0]) {
      const run = input.preparedRun;
      const association = run.association.value;
      const config = run.resolvedConfig;
      if (!preAuthorized || preparedAuthorized || input.environment !== "staging" ||
        run.applicationClass !== "draft_assistance" || run.capability !== "text" ||
        run.useCase !== "product_description_draft" || run.requestIdentity.requestedByPrincipalId !== ACTOR_ID ||
        run.requestIdentity.idempotencyKey !== IDEMPOTENCY_KEY ||
        run.requestIdentity.fingerprint !== REQUEST_FINGERPRINT || run.inputHash !== INPUT_HASH ||
        !controlledSourceIdentity(run.inputSources) || association.targetType !== "product_draft" ||
        association.targetProductId !== PRODUCT_ID || association.targetLocale !== "en" ||
        association.expectedTargetVersion !== 1 || run.associationSnapshotHash !== TARGET_HASH ||
        config.modelConfigId !== CONFIG_ID || config.modelConfigVersion !== 1 ||
        config.resolvedConfigHash !== RESOLVED_CONFIG_HASH || config.requestedProvider !== "deepseek" ||
        config.requestedModel !== "deepseek-v4-flash" || Object.keys(config.parametersSnapshot).length !== 0 ||
        config.maxInputTokens !== 2048 || config.maxOutputTokens !== 64 || config.maxAttempts !== 1 ||
        config.runCostLimitMicrousd !== 400 || run.promptIdentity.promptId !== "pd11-deepseek-product-draft" ||
        run.promptIdentity.promptVersion !== 1 || run.promptIdentity.promptHash !== PROMPT_HASH ||
        run.providerEnvelope.version !== 1 || run.providerEnvelope.hash !== ENVELOPE_HASH ||
        run.inputSchemaVersion !== 1 || run.outputSchemaVersion !== 1 ||
        run.policyVersion !== "draft-product-description-v1" ||
        providerRequestIdentity(run) !== PROVIDER_REQUEST_IDENTITY_HASH) {
        return aiFailure("environment_not_authorized");
      }
      preparedAuthorized = true;
      return aiSuccess(true as const);
    },
  });
  return Object.freeze({ executionAuthority, sourceAttestor });
}

export interface Node24LoopbackProjectionV1 {
  readonly status: "PASS";
  readonly runtime: {
    readonly node: "24.14.0";
    readonly v8: "13.6.233.17-node.41";
    readonly icu: "78.2";
    readonly unicode: "17.0";
    readonly cldr: "48.0";
    readonly platform: "darwin";
    readonly arch: "arm64";
  };
  readonly redirect_status: 302;
  readonly redirect_destination_hits: 0;
  readonly emitted_header_names: readonly string[];
}

export async function runNode24LoopbackSemanticGateV1(): Promise<Node24LoopbackProjectionV1> {
  const runtime = {
    node: process.versions.node,
    v8: process.versions.v8,
    icu: process.versions.icu,
    unicode: process.versions.unicode,
    cldr: process.versions.cldr,
    platform: process.platform,
    arch: process.arch,
  };
  if (JSON.stringify(runtime) !== JSON.stringify({
    node: "24.14.0", v8: "13.6.233.17-node.41", icu: "78.2", unicode: "17.0",
    cldr: "48.0", platform: "darwin", arch: "arm64",
  })) throw new Error("node24_loopback_runtime_mismatch");
  let destinationHits = 0;
  let headerNames: string[] = [];
  let baseUrl = "";
  const server = createServer((request, response) => {
    if (request.url === "/destination") {
      destinationHits += 1;
      response.writeHead(200).end();
      return;
    }
    if (request.url === "/headers") {
      headerNames = request.rawHeaders.filter((_, index) => index % 2 === 0)
        .map((name) => name.toLowerCase()).sort();
      response.writeHead(204).end();
      return;
    }
    response.writeHead(302, { Location: `${baseUrl}/destination` }).end();
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (address === null || typeof address === "string") throw new Error("node24_loopback_address_failed");
  baseUrl = `http://127.0.0.1:${address.port}`;
  try {
    const redirect = await fetch(`${baseUrl}/redirect`, { redirect: "manual" });
    await redirect.body?.cancel();
    if (redirect.status !== 302 || redirect.redirected || destinationHits !== 0) {
      throw new Error("node24_loopback_redirect_failed");
    }
    await fetch(`${baseUrl}/headers`, {
      method: "POST",
      redirect: "manual",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: "Bearer synthetic-loopback-only",
      },
      body: "{}",
    });
  } finally {
    server.close();
    await once(server, "close");
  }
  const expectedHeaders = [
    "accept", "accept-encoding", "accept-language", "authorization", "connection",
    "content-length", "content-type", "host", "sec-fetch-mode", "user-agent",
  ].sort();
  if (JSON.stringify(headerNames) !== JSON.stringify(expectedHeaders)) {
    throw new Error("node24_loopback_headers_failed");
  }
  return Object.freeze({
    status: "PASS",
    runtime: runtime as Node24LoopbackProjectionV1["runtime"],
    redirect_status: 302,
    redirect_destination_hits: 0,
    emitted_header_names: Object.freeze(headerNames),
  });
}

function createFixturePromptLoader(fixture: LoadedControlledFixtureV1): PromptBundleLoaderV1 {
  const result = createPromptBundleLoaderV1([{
    promptId: "pd11-deepseek-product-draft",
    promptVersion: 1,
    sha256: PROMPT_HASH,
    relativePath: `pd11-deepseek-product-draft/v1.${PROMPT_HASH}.json`,
    rawByteLength: fixture.promptBytes.byteLength,
    rawBase64: Buffer.from(fixture.promptBytes).toString("base64"),
  }]);
  if (!result.ok) throw new Error("controlled_prompt_invalid");
  return result.value;
}

function fixtureCommand(fixture: LoadedControlledFixtureV1): DraftAssistanceCommandV1 {
  const command: DraftAssistanceCommandV1 = {
    useCase: "product_description_draft",
    actor: { userId: ACTOR_ID, role: "product_editor" },
    target: { type: "product_draft", productId: PRODUCT_ID, locale: "en", expectedVersion: 1 },
    idempotencyKey: IDEMPOTENCY_KEY,
    contextSelections: [{ sourceClass: "explicit_human_input", origin: "typed_brief" }],
    explicitInput: fixture.resource.command.explicitInput,
  };
  return Object.freeze(command);
}

function safeFailure(status: "FAIL" | "NOT_RUN", code: string, input: {
  readonly fixture?: LoadedControlledFixtureV1;
  readonly runtime?: Node24LoopbackProjectionV1;
  readonly sources?: DeepSeekOfficialSourceProjectionV1;
}): ReadonlyJsonObject {
  return Object.freeze({
    schema: "cwt.phase-d.controlled-provider-validation",
    version: 1,
    status,
    safe_code: code,
    fixture_id: input.fixture?.resource.fixtureId ?? FIXTURE_ID,
    fixture_hash: input.fixture?.fixtureHash ?? FIXTURE_HASH,
    node24_loopback: input.runtime ?? null,
    official_sources: input.sources ?? null,
    billable_post: 0,
  }) as unknown as ReadonlyJsonObject;
}

export async function runControlledDeepSeekValidationV1(): Promise<ReadonlyJsonObject> {
  if (process.argv.slice(2).length !== 1 ||
    process.argv[2] !== "--execute-controlled-real-provider-validation" ||
    process.env.APP_ENV !== "staging" || process.env.FEATURE_AI !== "true" ||
    process.env.NON_PRODUCTION_NOINDEX !== "true" ||
    process.env.CWT_PHASE_D_CONTROLLED_VALIDATION !== "isolated-synthetic-postgres-v1") {
    return safeFailure("NOT_RUN", "controlled_validation_gate_rejected", {});
  }
  let fixture: LoadedControlledFixtureV1;
  try { fixture = await loadControlledDeepSeekFixtureV1(); } catch {
    return safeFailure("NOT_RUN", "controlled_fixture_invalid", {});
  }
  let runtime: Node24LoopbackProjectionV1;
  try { runtime = await runNode24LoopbackSemanticGateV1(); } catch {
    return safeFailure("NOT_RUN", "node24_loopback_failed", { fixture });
  }
  const sourceResult = await runDeepSeekOfficialSourcePreflightV1();
  if (!sourceResult.ok) {
    return Object.freeze({
      ...safeFailure("NOT_RUN", sourceResult.code, { fixture, runtime }),
      official_source_counters: sourceResult.counters,
    }) as unknown as ReadonlyJsonObject;
  }
  return runControlledDatabasePath({ fixture, runtime, sources: sourceResult.value });
}

async function runControlledDatabasePath(input: {
  readonly fixture: LoadedControlledFixtureV1;
  readonly runtime: Node24LoopbackProjectionV1;
  readonly sources: DeepSeekOfficialSourceProjectionV1;
}): Promise<ReadonlyJsonObject> {
  const databaseUrl = process.env.CWT_PHASE_D_VALIDATION_DATABASE_URL;
  if (databaseUrl === undefined) return safeFailure("NOT_RUN", "isolated_database_unavailable", input);
  let parsedUrl: URL;
  try { parsedUrl = new URL(databaseUrl); } catch {
    return safeFailure("NOT_RUN", "isolated_database_guard_failed", input);
  }
  const databaseName = parsedUrl.pathname.slice(1);
  if ((parsedUrl.protocol !== "postgres:" && parsedUrl.protocol !== "postgresql:") ||
    !["127.0.0.1", "localhost", "[::1]", "::1"].includes(parsedUrl.hostname) ||
    parsedUrl.search !== "" || parsedUrl.hash !== "" ||
    !/^cwt_phase_d_pd11_[a-f0-9]{12}$/.test(databaseName)) {
    return safeFailure("NOT_RUN", "isolated_database_guard_failed", input);
  }
  let client: Sql | undefined;
  let worker: ReturnType<typeof createAiRunWorkerV1> | undefined;
  try {
    client = postgres(databaseUrl, { max: 1, prepare: false, onnotice: () => undefined });
    const database = drizzle(client, { schema: databaseSchema });
    const guard = await client<{
      server_addr: string;
      database_name: string;
      is_superuser: boolean;
      other_sessions: number;
    }[]>`
      select inet_server_addr()::text as server_addr,
        current_database()::text as database_name,
        coalesce((select rolsuper from pg_roles where rolname = current_user), true) as is_superuser,
        (select count(*)::int from pg_stat_activity
          where datname = current_database() and pid <> pg_backend_pid()
            and backend_type = 'client backend') as other_sessions
    `;
    const observed = guard[0];
    if (observed === undefined || !["127.0.0.1", "::1"].includes(observed.server_addr) ||
      observed.database_name !== databaseName || observed.is_superuser || Number(observed.other_sessions) !== 0) {
      return safeFailure("NOT_RUN", "isolated_database_guard_failed", input);
    }
    const connection: DatabaseConnection = {
      kind: "postgres",
      db: database,
      createMigrationClient: () => postgres(databaseUrl, { max: 1, prepare: false, onnotice: () => undefined }),
      close: async () => undefined,
    };
    await migrateDatabase(connection);
    const retained = await inspectControlledDatabaseState(database, client);
    if (retained === "invalid") return safeFailure("NOT_RUN", "isolated_database_not_empty", input);
    if (retained === "retained") {
      return safeFailure("NOT_RUN", "controlled_validation_run_already_retained", input);
    }
    if (retained === "empty") await seedControlledDatabase(database, input.fixture);
    const authorities = createControlledValidationAuthoritiesV1(input.fixture);
    const provider = createDeepSeekTextProviderV1();
    const providerRegistry = createTextProviderRegistryV1([provider]);
    if (!providerRegistry.ok) return safeFailure("NOT_RUN", "provider_registry_invalid", input);
    const promptLoader = createFixturePromptLoader(input.fixture);
    const pricingRegistry = createDeepSeekPricingPolicyRegistryV1();
    const service = createPhaseCDurableDraftAssistanceServiceV1({
      database,
      trustedEnvironment: { appEnvironment: "staging", processFeatureAiEnabled: true },
      providerRegistry: providerRegistry.value,
      promptLoader,
      pricingRegistry,
      controlledValidationAuthority: authorities.executionAuthority,
      controlledValidationSourceAttestor: authorities.sourceAttestor,
    });
    const enqueued = await service.requestDraftAssistance(fixtureCommand(input.fixture));
    if (!enqueued.ok) return safeFailure("NOT_RUN", enqueued.error.code, input);
    const rowsBeforeWorker = await database.select().from(aiRuns);
    if (rowsBeforeWorker.length !== 1 || rowsBeforeWorker[0]?.id !== enqueued.value.runId) {
      return safeFailure("NOT_RUN", "durable_enqueue_mismatch", input);
    }
    const applicationRegistry = createPhaseCClaimedApplicationRegistryV1({
      controlledValidationSourceAttestor: authorities.sourceAttestor,
    });
    worker = createAiRunWorkerV1({
      database,
      trustedEnvironment: { appEnvironment: "staging", processFeatureAiEnabled: true },
      providerRegistry: providerRegistry.value,
      promptLoader,
      pricingRegistry,
      applicationRegistry,
      slotCount: 1,
      workerId: "cwt-phase-d-controlled-validation",
      timing: {
        heartbeatIntervalMs: 15_000,
        lockRetryDelayMs: 1_000,
        idlePollMs: 50,
        gracefulShutdownMs: 5_000,
        postAbortPersistenceMs: 1_000,
      },
    });
    await worker.start();
    let terminal: typeof aiRuns.$inferSelect | undefined;
    for (let poll = 0; poll < 2_600; poll += 1) {
      const selected = await database.select().from(aiRuns).where(eq(aiRuns.id, enqueued.value.runId)).limit(1);
      const row = selected[0];
      if (row !== undefined && (row.status === "draft_ready" || row.status === "failed" || row.status === "cancelled")) {
        terminal = row;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    await worker.stop("SIGTERM");
    worker = undefined;
    if (terminal === undefined) return safeFailure("FAIL", "terminal_row_timeout", input);
    return projectControlledTerminalRow(terminal, input);
  } catch {
    return safeFailure("FAIL", "controlled_validation_internal_failure", input);
  } finally {
    await worker?.stop("SIGTERM").catch(() => undefined);
    await client?.end().catch(() => undefined);
  }
}

async function inspectControlledDatabaseState(
  database: PostgresAppDatabase,
  client: Sql,
): Promise<"empty" | "retained" | "invalid"> {
  const publicTables = await client<{ tablename: string }[]>`
    select tablename::text from pg_tables
      where schemaname = 'public' and tablename <> '__drizzle_migrations'
      order by tablename
  `;
  const tableCounts = await Promise.all(publicTables.map(async ({ tablename }) => {
    const rows = await client<{ row_count: number }[]>`
      select count(*)::int as row_count from ${client(tablename)}
    `;
    return Number(rows[0]?.row_count ?? -1);
  }));
  if (tableCounts.some((count) => !Number.isSafeInteger(count) || count < 0)) return "invalid";
  const everyCwtTableCount = tableCounts.reduce((total, count) => total + count, 0);
  const [actorRows, taxonomyRows, productRows, localizationRows, linkRows, featureRows, configRows, runRows, auditRows] =
    await Promise.all([
      database.select().from(users),
      database.select().from(taxonomyTerms),
      database.select().from(products),
      database.select().from(productLocalizations),
      database.select().from(productTaxonomyTerms),
      database.select().from(featureFlags),
      database.select().from(aiModelConfig),
      database.select().from(aiRuns),
      database.select().from(auditLogs),
    ]);
  const count = actorRows.length + taxonomyRows.length + productRows.length + localizationRows.length +
    linkRows.length + featureRows.length + configRows.length + runRows.length + auditRows.length;
  if (count === 0) return everyCwtTableCount === 0 ? "empty" : "invalid";
  const exactSeed = actorRows.length === 1 && actorRows[0]?.id === ACTOR_ID &&
    actorRows[0].role === "product_editor" && actorRows[0].isActive &&
    taxonomyRows.length === 1 && taxonomyRows[0]?.id === TAXONOMY_ID &&
    productRows.length === 1 && productRows[0]?.id === PRODUCT_ID && productRows[0].status === "draft" &&
    localizationRows.length === 1 && localizationRows[0]?.productId === PRODUCT_ID &&
    localizationRows[0].locale === "en" && localizationRows[0].editorDocumentVersion === 1 &&
    linkRows.length === 1 && linkRows[0]?.productId === PRODUCT_ID && linkRows[0].taxonomyTermId === TAXONOMY_ID &&
    linkRows[0].isPrimary && featureRows.length === 1 && featureRows[0]?.key === "ai" && featureRows[0].enabled &&
    configRows.length === 1 && configRows[0]?.id === CONFIG_ID && configRows[0].recordVersion === 1 &&
    runRows.length <= 1 && auditRows.length <= 1;
  return exactSeed && everyCwtTableCount === count ? "retained" : "invalid";
}

async function seedControlledDatabase(
  database: PostgresAppDatabase,
  fixture: LoadedControlledFixtureV1,
): Promise<void> {
  await database.transaction(async (transaction) => {
    await transaction.insert(users).values({
      id: ACTOR_ID,
      email: fixture.resource.database.actor.email,
      displayName: fixture.resource.database.actor.displayName,
      role: "product_editor",
      passwordHash: fixture.resource.database.actor.passwordHash,
      isActive: true,
    });
    await transaction.insert(taxonomyTerms).values({
      id: TAXONOMY_ID,
      internalKey: fixture.resource.database.taxonomy.internalKey,
      dimension: "material_fiber",
    });
    await transaction.insert(products).values({ id: PRODUCT_ID, status: "draft", createdByUserId: ACTOR_ID });
    await transaction.insert(productLocalizations).values({
      productId: PRODUCT_ID,
      locale: "en",
      name: fixture.resource.database.product.name,
      editorDocumentVersion: 1,
    });
    await transaction.insert(productTaxonomyTerms).values({
      productId: PRODUCT_ID,
      taxonomyTermId: TAXONOMY_ID,
      isPrimary: true,
    });
    await transaction.insert(featureFlags).values({
      key: "ai",
      enabled: true,
      updatedByUserId: ACTOR_ID,
    });
    await transaction.insert(aiModelConfig).values({
      id: CONFIG_ID,
      useCase: "product_description_draft",
      provider: "deepseek",
      model: "deepseek-v4-flash",
      parametersJson: {},
      maxInputTokens: 2048,
      maxOutputTokens: 64,
      maxAttempts: 1,
      runCostLimitMicrousd: 400,
      promptId: "pd11-deepseek-product-draft",
      promptVersion: 1,
      promptHash: PROMPT_HASH,
      enabled: true,
      isDefault: true,
      createdByUserId: ACTOR_ID,
      updatedByUserId: ACTOR_ID,
    });
  });
}

function record(value: unknown): Readonly<Record<string, ReadonlyJsonValue>> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Readonly<Record<string, ReadonlyJsonValue>> : undefined;
}

const CONTROLLED_ATTEMPT_KEYS = [
  "version", "attempt", "dispatch_state", "outcome", "requested_provider", "actual_provider",
  "requested_model", "returned_model", "provider_envelope_version", "provider_envelope_hash",
  "dispatched_at", "responded_at", "duration_ms", "input_tokens", "output_tokens", "total_tokens",
  "cache_hit_input_tokens", "cache_miss_input_tokens", "attempt_upper_cost_microusd",
  "actual_cost_microusd", "accounted_cost_microusd", "actual_cost_complete",
  "provider_response_status", "provider_http_status", "provider_error_code", "provider_request_id",
  "provider_system_fingerprint", "failure_code", "controlled_validation_fixture_id",
  "controlled_validation_fixture_hash", "provider_request_identity_version",
  "provider_request_identity_hash", "response_fingerprint",
] as const;

function controlledAttemptProjection(value: unknown): ReadonlyJsonObject | undefined {
  const attempt = record(value);
  if (attempt === undefined || JSON.stringify(Object.keys(attempt).sort()) !==
    JSON.stringify([...CONTROLLED_ATTEMPT_KEYS].sort())) return undefined;
  return Object.freeze({
    version: attempt.version,
    attempt: attempt.attempt,
    dispatch_state: attempt.dispatch_state,
    outcome: attempt.outcome,
    requested_provider: attempt.requested_provider,
    actual_provider: attempt.actual_provider,
    requested_model: attempt.requested_model,
    returned_model: attempt.returned_model,
    provider_envelope_version: attempt.provider_envelope_version,
    provider_envelope_hash: attempt.provider_envelope_hash,
    dispatched_at: attempt.dispatched_at,
    responded_at: attempt.responded_at,
    duration_ms: attempt.duration_ms,
    input_tokens: attempt.input_tokens,
    output_tokens: attempt.output_tokens,
    total_tokens: attempt.total_tokens,
    cache_hit_input_tokens: attempt.cache_hit_input_tokens,
    cache_miss_input_tokens: attempt.cache_miss_input_tokens,
    attempt_upper_cost_microusd: attempt.attempt_upper_cost_microusd,
    actual_cost_microusd: attempt.actual_cost_microusd,
    accounted_cost_microusd: attempt.accounted_cost_microusd,
    actual_cost_complete: attempt.actual_cost_complete,
    provider_response_status: attempt.provider_response_status,
    provider_http_status: attempt.provider_http_status,
    provider_error_code: attempt.provider_error_code,
    provider_request_id: attempt.provider_request_id,
    provider_system_fingerprint: attempt.provider_system_fingerprint,
    failure_code: attempt.failure_code,
    controlled_validation_fixture_id: attempt.controlled_validation_fixture_id,
    controlled_validation_fixture_hash: attempt.controlled_validation_fixture_hash,
    provider_request_identity_version: attempt.provider_request_identity_version,
    provider_request_identity_hash: attempt.provider_request_identity_hash,
    response_fingerprint: attempt.response_fingerprint,
  }) as ReadonlyJsonObject;
}

function projectControlledTerminalRow(
  row: typeof aiRuns.$inferSelect,
  input: {
    readonly fixture: LoadedControlledFixtureV1;
    readonly runtime: Node24LoopbackProjectionV1;
    readonly sources: DeepSeekOfficialSourceProjectionV1;
  },
): ReadonlyJsonObject {
  const history = Array.isArray(row.attemptHistoryJson) ? row.attemptHistoryJson : [];
  const attempt = history.length === 1 ? controlledAttemptProjection(history[0]) : undefined;
  const candidateRecord = record(row.candidateJson);
  const protectedCandidate = row.candidateJson === null ? undefined : canonicalJsonHash(row.candidateJson);
  const payload = candidateRecord?.payload;
  const candidate = payload === undefined ? undefined : canonicalJsonHash(payload);
  const candidateMatches = candidate?.ok === true && candidate.value.hash === EXPECTED_OUTPUT_HASH &&
    protectedCandidate?.ok === true && protectedCandidate.value.hash === PROTECTED_OUTPUT_HASH &&
    row.candidateHash === PROTECTED_OUTPUT_HASH;
  const identityMatches = row.idempotencyKey === IDEMPOTENCY_KEY && row.requestFingerprintVersion === 1 &&
    row.requestFingerprint === REQUEST_FINGERPRINT && row.targetSnapshotHash === TARGET_HASH &&
    row.inputHash === INPUT_HASH && row.modelConfigId === CONFIG_ID && row.modelConfigVersion === 1 &&
    row.resolvedConfigHash === RESOLVED_CONFIG_HASH && row.promptHash === PROMPT_HASH &&
    row.providerEnvelopeHash === ENVELOPE_HASH && attempt?.controlled_validation_fixture_id === FIXTURE_ID &&
    attempt.controlled_validation_fixture_hash === FIXTURE_HASH &&
    attempt.provider_request_identity_version === 1 &&
    attempt.provider_request_identity_hash === PROVIDER_REQUEST_IDENTITY_HASH;
  const status = row.status === "draft_ready" && row.attemptCount === 1 && history.length === 1 &&
    row.providerDispatchedAt !== null && candidateMatches && identityMatches ? "PASS" : "FAIL";
  return Object.freeze({
    schema: "cwt.phase-d.controlled-provider-validation",
    version: 1,
    status,
    candidate_binding: "phase-d-implementation-v1",
    runtime: input.runtime,
    official_sources: input.sources,
    expected_identities: {
      fixture_id: FIXTURE_ID,
      fixture_hash: FIXTURE_HASH,
      prompt_hash: PROMPT_HASH,
      target_hash: TARGET_HASH,
      input_hash: INPUT_HASH,
      explicit_input_hash: EXPLICIT_INPUT_HASH,
      request_fingerprint: REQUEST_FINGERPRINT,
      expected_output_hash: EXPECTED_OUTPUT_HASH,
      protected_output_hash: PROTECTED_OUTPUT_HASH,
      resolved_config_hash: RESOLVED_CONFIG_HASH,
      envelope_hash: ENVELOPE_HASH,
      rendered_instruction_hash: RENDERED_INSTRUCTION_HASH,
      provider_request_identity_hash: PROVIDER_REQUEST_IDENTITY_HASH,
    },
    run: {
      id: row.id,
      execution_environment: row.executionEnvironment,
      application_class: row.applicationClass,
      use_case: row.useCase,
      status: row.status,
      retry_state: row.retryState,
      attempt_count: row.attemptCount,
      state_version: row.stateVersion,
      queued_at: row.queuedAt.toISOString(),
      dispatched_at: row.providerDispatchedAt?.toISOString() ?? null,
      completed_at: row.completedAt?.toISOString() ?? null,
      idempotency_key: row.idempotencyKey,
      request_fingerprint_version: row.requestFingerprintVersion,
      request_fingerprint: row.requestFingerprint,
      target_snapshot_hash: row.targetSnapshotHash,
      input_hash: row.inputHash,
      model_config_id: row.modelConfigId,
      model_config_version: row.modelConfigVersion,
      resolved_config_hash: row.resolvedConfigHash,
      prompt_id: row.promptId,
      prompt_version: row.promptVersion,
      prompt_hash: row.promptHash,
      requested_provider: row.requestedProvider,
      actual_provider: row.actualProvider,
      requested_model: row.requestedModel,
      returned_model: row.returnedModel,
      parameters_snapshot: row.parametersSnapshotJson as ReadonlyJsonValue,
      max_input_tokens: row.maxInputTokens,
      max_output_tokens: row.maxOutputTokens,
      max_attempts: row.maxAttempts,
      provider_envelope_version: row.providerEnvelopeVersion,
      provider_envelope_hash: row.providerEnvelopeHash,
      provider_response_status: row.providerResponseStatus,
      provider_http_status: row.providerHttpStatus,
      provider_error_code: row.providerErrorCode,
      provider_request_id: row.providerRequestId,
      input_tokens: row.inputTokens,
      output_tokens: row.outputTokens,
      total_tokens: row.totalTokens,
      actual_cost_microusd: row.actualCostMicrousd,
      actual_cost_complete: row.actualCostComplete,
      accounted_cost_microusd: row.budgetAccountedCostMicrousd,
      candidate_hash: row.candidateHash,
      candidate_equals_expected: candidateMatches,
    },
    attempt: attempt ?? null,
    pricing: deepSeekPricingSnapshotV2,
    external_call_counts: {
      ...input.sources.counters,
      billable_post: row.providerDispatchedAt === null ? 0 : 1,
    },
  }) as unknown as ReadonlyJsonObject;
}
